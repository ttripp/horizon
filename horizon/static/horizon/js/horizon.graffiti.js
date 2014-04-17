/*
 * (c) Copyright [2014] Hewlett-Packard Development Company, L.P.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
angular.module('hz').service('graffitiService', ['$http', '$q',
  function($http, $q) {
    'use strict';
    var self = this;

    /*
     * http to backend
     */
    self.get_namespaces = function(base_uri, token, error_function, add_function) {
      var deferred = $q.defer();
      $http.defaults.headers.common['Accept'] = 'application/json';
      $http.defaults.headers.common['X-Auth-Token'] = token;

      $http.get(base_uri + 'namespace/list')
        .success(function(data) {
          if (data) {
            deferred.resolve(data);
          } else {
            deferred.reject('Not Found');
          }
        }).error(error_function);
      return deferred.promise;
    };

    self.get_capabilities_in_namespace = function(namespace, base_uri, token, error_function) {
      var deferred = $q.defer();
      $http.defaults.headers.common['Accept'] = 'application/flare';
      $http.defaults.headers.common['X-Auth-Token'] = token;

      $http.get(base_uri + 'capability_type/all/' + namespace)
        .success(function(data) {
          if (data) {
            deferred.resolve(data);
          } else {
            deferred.reject('Not Found');
          }
        }).error(error_function);
      return deferred.promise;
    };

    self.get_existing_capabilities = function(object_id, endpoint_id, base_uri, token, error_function) {
      var deferred = $q.defer();
      $http.defaults.headers.common['Accept'] = 'application/json';
      $http.defaults.headers.common['X-Auth-Token'] = token;

      // TODO(heather): load initial data from graffiti
    };

    self.get_capability_properties = function(namespace, capability, base_uri, token, error_function) {
      var deferred = $q.defer();
      $http.defaults.headers.common['Accept'] = 'application/json';
      $http.defaults.headers.common['X-Auth-Token'] = token;

      $http.get(base_uri + 'capability_type/derived_properties/' + capability + '/' + namespace)
        .success(function(data) {
          if (data) {
            deferred.resolve(data);
          } else {
            deferred.reject('Not Found');
          }
        }).error(error_function);
      return deferred.promise;
    };

    self.get_property_operators = function(base_uri, token, error_function) {
      var deferred = $q.defer();
      $http.defaults.headers.common['Accept'] = 'application/json';
      $http.defaults.headers.common['X-Auth-Token'] = token;

      $http.get(base_uri + 'resource/propertyOperators')
        .success(function(data) {
          if (data) {
            deferred.resolve(data);
          } else {
            deferred.reject('Not Found');
          }
        }).error(error_function);
      return deferred.promise;
    };

    /*
     * data format conversion
     */
    self.transform_flare_to_abn_tree = function(namespace, node, add_function) {
      node.label = node.name;
      node.data = {namespace: namespace.namespace};
      node.onAdd = add_function;
      for (var i = 0; i < node.children.length; i++) {
        self.transform_flare_to_abn_tree(namespace, node.children[i], add_function);
      };
    };

    self.transform_json_namespaces_to_abn_tree = function(namespace, nodes, add_function, output) {
      var children = [];
      angular.forEach(nodes.children, function(node) {
        self.transform_flare_to_abn_tree(namespace, node, add_function);
        children.push(node);
      });
      output.push({label: namespace.namespace, children: children});
    };
}]);
