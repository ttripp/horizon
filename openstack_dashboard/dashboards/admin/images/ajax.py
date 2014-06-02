import simplejson

from dajaxice.decorators import dajaxice_register

from openstack_dashboard import api


@dajaxice_register
def graffiti_get_namespaces(request, *args, **kwargs):
    namespaces = api.graffiti.get_namespaces(request, kwargs['obj_type'])

    return simplejson.dumps(namespaces)
