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
          deferred.resolve(data);
        }).error(error_function);
      return deferred.promise;
    };

    self.get_existing_capabilities = function(object_type, object_id, endpoint_id, base_uri, token, error_function) {
      var deferred = $q.defer();
      $http.defaults.headers.common['Accept'] = 'application/json';
      $http.defaults.headers.common['X-Auth-Token'] = token;

      $http.get(base_uri + 'resource/' + object_type + '/' + object_id + '/' + endpoint_id + '/')
        .success(function(data) {
          if (data) {
            deferred.resolve(data);
          } else {
            deferred.resolve(null);
          }
        }).error(error_function);
      return deferred.promise;
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

    self.put_capabilities = function(obj_id, data, base_uri, token, error_function) {
      var deferred = $q.defer();
      $http.defaults.headers.common['Accept'] = 'application/json';
      $http.defaults.headers.common['X-Auth-Token'] = token;

      $http.put(base_uri + 'resource/' + obj_id, data)
        .success(function(data) {
	  deferred.resolve(data);
          console.log("put success");
        }).error(error_function);
      return deferred.promise;
    }

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
      node.data = {namespace: namespace.namespace, properties_loaded: false};
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

    self.transform_json_properties_to_abn_tree = function(abn_tree_branch, capability) {
      if (!abn_tree_branch.data.properties) {
        abn_tree_branch.data.properties = [];
      };
      if (capability) {
        abn_tree_branch.label = capability.name;
        abn_tree_branch.data.namespace = capability.namespace;
        abn_tree_branch.description = capability.description;
      };
      if (capability.properties) {
        angular.forEach(capability.properties, function(value, key) {
          if (value && key) {
            if (value.confidential) {
              value.type = "confidential";
            };
            var found = false;
            for (var i = 0; i < abn_tree_branch.data.properties.length; i++) {
              if (key.toLowerCase() == abn_tree_branch.data.properties[i].name.toLowerCase()) {
                abn_tree_branch.data.properties[i].name = key;
                abn_tree_branch.data.properties[i].type = value.type;
                if (value.description) {
                  abn_tree_branch.data.properties[i].description = value.description;
                };
                if (value.itemType) {
                  abn_tree_branch.data.properties[i].itemType = value.itemType;
                };
                if (value.items) {
                  abn_tree_branch.data.properties[i].items = value.items;
                };
                found = true;
                break;
              };
            };
            if (!found) {
              abn_tree_branch.data.properties.push({name: key, value: value.defaultValue, type: value.type, description: value.description, itemType: value.itemType, items: value.items});
            };
          };
        });
      };
      if (capability.derived_properties) {
        angular.forEach(capability.derived_properties, function(value, key) {
          if (value && key) {
            if (value.confidential) {
              value.type = "confidential";
            };
            var found = false;
            for (var i = 0; i < abn_tree_branch.data.properties.length; i++) {
              if (key.toLowerCase() == abn_tree_branch.data.properties[i].name.toLowerCase()) {
                abn_tree_branch.data.properties[i].name = key;
                abn_tree_branch.data.properties[i].type = value.type;
                if (value.description) {
                  abn_tree_branch.data.properties[i].description = value.description;
                };
                if (value.itemType) {
                  abn_tree_branch.data.properties[i].itemType = value.itemType;
                };
                if (value.items) {
                  abn_tree_branch.data.properties[i].items = value.items;
                }
                found = true;
                break;
              };
            };
            if (!found) {
              abn_tree_branch.data.properties.push({name: key, value: value.defaultValue, type: value.type, description: value.description, itemType: value.itemType, items: value.items});
            };
          };
        });
      };
    };

    self.transform_json_requirement_properties_to_abn_tree = function(abn_tree_branch, requirement, available_operators) {
      var get_operator = function(type) {
        for (var i = 0; i < available_operators.length; i++) {
          if (available_operators[i].type == type) {
            return available_operators[i];
          };
        };
        return null;
      };

      if (!abn_tree_branch.data.properties) {
        abn_tree_branch.data.properties = [];
      };

      if (requirement.properties) {
        angular.forEach(requirement.properties, function(value, key) {
          if (value && key) {
            var type = value.type;

            if (value.confidential) {
              value.type = "confidential";
            }

            value.name = key;
            value.value = "";
            value.operator = get_operator(type);
            value.is_duplicate = false;
            value.required = true;
            abn_tree_branch.data.properties.push(value);
          };
        });
      };

      if (requirement.derived_properties) {
        angular.forEach(requirement.derived_properties, function(value, key) {
          if (value && key) {
            var type = value.type;

            if (value.confidential) {
              value.type = "confidential";
            }

            value.name = key;
            value.value = "";
            value.operator = get_operator(type);
            value.is_duplicate = false;
            value.required = true;
            abn_tree_branch.data.properties.push(value);
          };
        });
      };
    };

    self.detect_validity_errors = function(property_value) {
      if (property_value) {
        if (property_value.$error.required) {
          return "This property is required.";
        } else if (property_value.$error.minlength) {
          return "The entered value is too short.";
        } else if (property_value.$error.maxlength) {
          return "The entered value is too long.";
        } else if (property_value.$error.pattern) {
          return "The entered value does not match the pattern.";
        } else if (property_value.$error.number) {
          return "The value must be a number.";
        } else {
          return "Invalid value.";
        };
      } else {
        return "No property value.";
      };
    };

}]);
