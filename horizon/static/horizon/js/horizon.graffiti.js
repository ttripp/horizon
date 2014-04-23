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
     * filter
     */
    self.filter_namespaces = function(abn_tree_data, filter_data, obj_type, widget_type) {
      if (filter_data) {
        var namespace_list = [];
        angular.forEach(filter_data, function(widget_list, namespace) {
          angular.forEach(widget_list, function(obj_list, widget) {
            if (widget == widget_type) {
              for (var i = 0; i < obj_list.length; i++) {
                if (obj_list[i] == obj_type) {
                  namespace_list.push(namespace);
                  break;
                };
              };
            };
          });
        });
        for (var i = 0; i < abn_tree_data.length; i++) {
          abn_tree_data[i].visible = false;
          for (var j = 0; j < namespace_list.length; j++) {
            if (abn_tree_data[i].label == namespace_list[j]) {
              abn_tree_data[i].visible = true;
              break;
            };
          };
        };
      } else {
        for (var i = 0; i < abn_tree_data.length; i++) {
          abn_tree_data[i].visible = true;
        };
      };
    };

    /*
     * data format conversion
     */
    self.transform_flare_to_abn_tree = function(namespace, node, add_function) {
      node.label = node.name;
      node.data = {namespace: namespace.namespace};
      node.onAdd = add_function;
      if (node.children) {
        node.children.sort(function(a,b) {return a.name.localeCompare(b.name)});
        for (var i = 0; i < node.children.length; i++) {
          self.transform_flare_to_abn_tree(namespace, node.children[i], add_function);
        };
      };
    };

    self.transform_json_namespaces_to_abn_tree = function(namespace, nodes, add_function, output) {
      var children = [];
      nodes.children.sort(function(a,b) {return a.name.localeCompare(b.name)});
      angular.forEach(nodes.children, function(node) {
        self.transform_flare_to_abn_tree(namespace, node, add_function);
        children.push(node);
      });
      output.push({label: namespace.namespace, children: children, visible: namespace.visible});
      output.sort(function(a,b) {return a.label.localeCompare(b.label)});
    };
}]);
