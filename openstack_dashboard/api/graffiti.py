# Copyright 2012 United States Government as represented by the
# Administrator of the National Aeronautics and Space Administration.
# All Rights Reserved.
#
# Copyright 2012 Nebula, Inc.
#
#    Licensed under the Apache License, Version 2.0 (the "License"); you may
#    not use this file except in compliance with the License. You may obtain
#    a copy of the License at
#
#         http://www.apache.org/licenses/LICENSE-2.0
#
#    Unless required by applicable law or agreed to in writing, software
#    distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
#    WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
#    License for the specific language governing permissions and limitations
#    under the License.

import copy
import logging
import re
import requests
import six
import socket
import struct

from six.moves import http_client
from six.moves.urllib import parse

from django.conf import settings


LOG = logging.getLogger(__name__)
USER_AGENT = 'openstack_dashboard.api.graffiti'

try:
    import json
except ImportError:
    import simplejson as json  # noqa

if not hasattr(parse, 'parse_qsl'):
    import cgi
    parse.parse_qsl = cgi.parse_qsl

import OpenSSL


def _get_sock_opt(self, *args, **kwargs):
    return self.fd.getsockopt(*args, **kwargs)

try:
    from eventlet import patcher
    if patcher.is_monkey_patched('socket'):
        from eventlet.green.httplib import HTTPSConnection
        from eventlet.green.OpenSSL.SSL import GreenConnection as Connection
        from eventlet.greenio import GreenSocket
        GreenSocket.getsockopt = _get_sock_opt
    else:
        raise ImportError
except ImportError:
    HTTPSConnection = http_client.HTTPSConnection
    from OpenSSL.SSL import Connection as Connection


class CommunicationError(BaseException):
    pass


class HTTPException(BaseException):
    pass


class HTTPUnauthorized(BaseException):
    code = 401


class InvalidEndpoint(BaseException):
    pass


class SSLCertificateError(BaseException):
    pass


class SSLConfigurationError(BaseException):
    pass


class GraffitiClient(object):
    """Client for the Metadata v1 API."""

    def __init__(self, endpoint, *args, **kwargs):
        self.endpoint = endpoint
        endpoint_parts = parse.urlparse(self.endpoint)
        self.endpoint_scheme = endpoint_parts.scheme
        self.endpoint_hostname = endpoint_parts.hostname
        self.endpoint_port = endpoint_parts.port
        self.endpoint_path = endpoint_parts.path

        self.connection_class = self.get_connection_class(self.endpoint_scheme)

        self.identity_headers = kwargs.get('identity_headers')
        # TODO(heather): use Keystone auth
        self.auth_token = getattr(settings, 'GRAFFITI_TOKEN', None)
#        self.auth_token = kwargs.get('token')
#        if self.identity_headers:
#            if self.identity_headers.get('X-Auth-Token'):
#                self.auth_token = self.identity_headers.get('X-Auth-Token')
#                del self.identity_headers['X-Auth-Token']

    @staticmethod
    def get_connection_class(scheme):
        if scheme == 'https':
            return VerifiedHTTPSConnection
        else:
            return http_client.HTTPConnection

    def _http_request(self, url, method, **kwargs):
        kwargs['headers'] = copy.deepcopy(kwargs.get('headers', {}))
        kwargs['headers'].setdefault('User-Agent', USER_AGENT)
        if self.auth_token:
            kwargs['headers'].setdefault('X-Auth-Token', self.auth_token)

        if method != 'GET':
            allow_redirects = False
        else:
            allow_redirects = True

        try:
            resp = requests.request(method, self.endpoint + url,
                                    allow_redirects=allow_redirects,
                                    **kwargs)
            status = (resp.raw.version / 10.0,
                        resp.status_code, resp.reason)
            dump = ['\nHTTP/%.1f %s %s' % status]
            dump.extend(['%s: %s' % (k, v)
                            for k, v in resp.headers.items()])
            dump.append('')
            if resp.content:
                content = resp.content
                if isinstance(content, six.binary_type):
                    content = content.decode()
                dump.extend([content, ''])
        except socket.gaierror as e:
            message = ("Error finding address for %(url)s: %(e)s" %
                        {'url': self.endpoint + url, 'e': e})
            raise InvalidEndpoint(message=message)
        except (socket.error, socket.timeout) as e:
            endpoint = self.endpoint
            message = ("Error communicating with %(endpoint)s %(e)s" %
                        {'endpoint': endpoint, 'e': e})
            raise CommunicationError(message=message)

        if not 'X-Auth-Key' in kwargs['headers'] and \
                (resp.status_code == 401 or
                    (resp.status_code == 500 and
                    "(HTTP 401)" in resp.content)):
            raise HTTPUnauthorized("Authentication failed.")
        elif 400 <= resp.status_code < 600:
            message = ("Bad HTTP status code %(status_code)s: %(resp)s" %
                        {'status_code': resp.status_code, 'resp': resp})
            raise HTTPException(message=message)
        elif resp.status_code in (301, 302, 305):
            location = resp.headers.get('location')
            if location is None:
                message = "Location not returned with redirect"
                raise InvalidEndpoint(message=message)
            elif location.startswith(self.endpoint):
                location = location[len(self.endpoint):]
            else:
                message = "Prohibited endpoint redirect %s" % location
                raise InvalidEndpoint(message=message)
            return self._http_request(location, method, **kwargs)
        elif resp.status_code == 300:
            message = ("Bad HTTP status code %(status_code)s: %(resp)s" %
                        {'status_code': resp.status_code, 'resp': resp})
            raise HTTPException(message=message)

        return resp

    def _json_request(self, method, url, **kwargs):
        kwargs.setdefault('headers', {})
        kwargs['headers'].setdefault('Content-Type', 'application/json')
        kwargs['headers'].setdefault('Accept', 'application/json')

        if 'data' in kwargs:
            kwargs['data'] = json.dumps(kwargs['data'])

        resp = self._http_request(url, method, **kwargs)
        body = resp.content
        if 'application/json' in resp.headers.get('content-type', ''):
            try:
                body = resp.json()
            except ValueError:
                LOG.error('Could not decode response body as JSON')
        else:
            body = None

        return resp, body

    def get_namespaces(self, obj_type):
        resp, body = self._json_request('GET', 'namespace/list')
        return body


class OpenSSLConnectionDelegator(object):
    def __init__(self, *args, **kwargs):
        self.connection = Connection(*args, **kwargs)

    def __getattr__(self, name):
        return getattr(self.connection, name)

    def makefile(self, *args, **kwargs):
        kwargs['close'] = True

        return socket._fileobject(self.connection, *args, **kwargs)


class VerifiedHTTPSConnection(HTTPSConnection):
    def __init__(self, host, port=None, key_file=None, cert_file=None,
                 cacert=None, timeout=None, insecure=False,
                 ssl_compression=True):
        HTTPSConnection.__init__(self, host, port,
                                 key_file=key_file,
                                 cert_file=cert_file)
        self.key_file = key_file
        self.cert_file = cert_file
        self.timeout = timeout
        self.insecure = insecure
        self.ssl_compression = ssl_compression
        self.cacert = cacert
        self.setcontext()

    @staticmethod
    def host_matches_cert(host, x509):
        def check_match(name):
            if name == host:
                return True

            if name.startswith('*.') and host.find('.') > 0:
                if name[2:] == host.split('.', 1)[1]:
                    return True

        common_name = x509.get_subject().commonName

        if check_match(common_name):
            return True

        san_list = None
        for i in range(x509.get_extension_count()):
            ext = x509.get_extension(i)
            if ext.get_short_name() == 'subjectAltName':
                san_list = str(ext)
                for san in ''.join(san_list.split()).split(','):
                    if san.startswith('DNS:'):
                        if check_match(san.split(':', 1)[1]):
                            return True

        msg = ('Host "%s" does not match x509 certificate contents: '
               'CommonName "%s"' % (host, common_name))
        if san_list is not None:
            msg = msg + ', subjectAltName "%s"' % san_list
        raise SSLCertificateError(msg)

    def verify_callback(self, connection, x509, errnum, depth, preverify_ok):
        preverify_ok = bool(preverify_ok)
        if x509.has_expired():
            msg = "SSL Certificate expired on '%s'" % x509.get_notAfter()
            raise SSLCertificateError(msg)

        if depth == 0 and preverify_ok:
            return self.host_matches_cert(self.host, x509)
        else:
            return preverify_ok

    def setcontext(self):
        self.context = OpenSSL.SSL.Context(OpenSSL.SSL.SSLv23_METHOD)

        if self.ssl_compression is False:
            self.context.set_options(0x20000)

        if self.insecure is not True:
            self.context.set_verify(OpenSSL.SSL.VERIFY_PEER,
                                    self.verify_callback)
        else:
            self.context.set_verify(OpenSSL.SSL.VERIFY_NONE,
                                    lambda *args: True)

        if self.cert_file:
            try:
                self.context.use_certificate_file(self.cert_file)
            except Exception as e:
                msg = 'Unable to load cert from "%s" %s' % (self.cert_file, e)
                raise SSLConfigurationError(msg)
            if self.key_file is None:
                try:
                    self.context.use_privatekey_file(self.cert_file)
                except Exception as e:
                    msg = ('No key file specified and unable to load key '
                           'from "%s" %s' % (self.cert_file, e))
                    raise SSLConfigurationError(msg)

        if self.key_file:
            try:
                self.context.user_privatekey_file(self.key_file)
            except Exception as e:
                msg = 'Unable to load key from "%s" %s' % (self.key_file, e)
                raise SSLConfigurationError(msg)

        if self.cacert:
            try:
                self.context.load_verify_locations(self.cacert)
            except Exception as e:
                msg = ('Unable to load CA from "%(cacert)s" %(exc)s' %
                       dict(cacert=self.cacert, exc=e))
                raise SSLConfigurationError(msg)
        else:
            self.context.set_default_verify_paths()

    def connect(self):
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        if self.timeout is not None:
            sock.setsockopt(socket.SOL_SOCKET, socket.SO_RCVTIMEO,
                            struct.pack('fL', self.timeout, 0))
        self.sock = OpenSSLConnectionDelegator(self.context, sock)
        self.sock.connect((self.host, self.port))

    def close(self):
        if self.sock:
            self.sock = None
        HTTPSConnection.close(self)


def graffiticlient(request):
    # TODO(heather): move to Keystone lookup for URL
    url = getattr(settings, 'GRAFFITI_TEMP_URL', None)
    insecure = getattr(settings, 'OPENSTACK_SSL_NO_VERIFY', False)
    cacert = getattr(settings, 'OPENSTACK_SSL_CACERT', None)
    LOG.debug('graffiticlient connection created using token "%s" and url "%s"'
              % (request.user.token.id, url))
    return GraffitiClient(url, token=request.user.token.id,
                          insecure=insecure, cacert=cacert)


def get_namespaces(request, obj_type):
    return graffiticlient(request).get_namespaces(obj_type)


def _strip_version(endpoint):
    if endpoint.endswith('/'):
        endpoint = endpoint[:-1]
    url_bits = endpoint.split('/')
    if re.match('v\d+\.?\d*', url_bits[-1]):
        endpoint = '/'.join(url_bits[:-1])
    return endpoint
