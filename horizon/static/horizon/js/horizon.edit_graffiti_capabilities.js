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
angular.module('hz').directive('editGraffitiCapabilities',
  function() {
    return {
      restrict: 'AEC',
      replace: true,
      templateUrl: '/static/horizon/js/angular/graffiti/partials/edit_graffiti_capabilities.html',
      controller: 'EditGraffitiCapabilitiesController'
    }
  })
.controller('EditGraffitiCapabilitiesController',
            ['$scope', '$http', '$q', '$timeout', 'graffitiService',

  function ($scope, $http, $q, $timeout, graffitiService) {
    'use strict';

    /**
     * tree controls
     */
    // available tree
    $scope.capabilities_available_tree_control = {}
    // branch is selected in available tree
    $scope.capabilities_available_branch_select_handler = function(branch) {
      $scope.capabilities_available_description = branch.description;
    };
    // available tree is loading
    $scope.capabilities_available_is_loading = function() {
      return $scope.capabilities_available_loading;
    };
    // available tree had an error
    $scope.capabilities_available_is_error = function() {
      if (!$scope.capabilities_available_loading) {
        if ($scope.capabilities_available_load_error) {
          return true;
        }
      }
      return false;
    };
    // available tree error text
    $scope.capabilities_available_get_error_text = function() {
      return $scope.capabilities_available_load_error;
    };

    // existing tree
    $scope.capabilities_existing_tree_control = {}
    // branch is selected in existing tree
    $scope.capabilities_existing_branch_select_handler = function(branch) {
      $scope.capabilities_existing_description = branch.description;
    };
    // existing tree is loading
    $scope.capabilities_existing_is_loading = function() {
      return $scope.capabilities_existing_loading;
    };
    // existing tree had an error
    $scope.capabilities_existing_is_error = function() {
      if (!$scope.capabilities_existing_loading) {
        if ($scope.capabilities_existing_load_error) {
          return true;
        };
      };
      return false;
    };
    // existing tree error text
    $scope.capabilities_existing_get_error_text = function() {
      return $scope.capabilities_existing_load_error;
    };

    /**
     * setup
     */
    var load_state_enum = {
      LOAD: "first load",
      RELOAD: "reload, new object",
      TAB: "reload, tab change"
    }

    // instance-specific data from python
    var temp_url = $(".django_data_holder").data('temp-url');
    var temp_token = JSON.stringify($(".django_data_holder").data('temp-token'));
    var token = $(".django_data_holder").data('token');
    var service_url = $(".django_data_holder").data('service-url');
    var endpoint_id = $(".django_data_holder").data('endpoint-id');
    var obj_type = $(".django_data_holder").data('obj-type');
    var obj_name = $(".django_data_holder").data('obj-name');
    // TODO(heather): this should come from the namespace data
    var namespace_type_mapping = $(".django_data_holder").data('namespace-type-mapping');
    var load_state = load_state_enum.LOAD;
    if ($scope.capabilities_obj_id) {
      load_state = load_state_enum.TAB;
      var old_obj_id = angular.copy($scope.capabilities_obj_id);
    };
    $scope.capabilities_obj_id = $(".django_data_holder").data('obj-id').toString();
    if (old_obj_id && old_obj_id != $scope.capabilities_obj_id) {
      load_state = load_state_enum.RELOAD;
    };
    var default_properties_namespace = obj_type + "::Default";
    var default_properties_capability_name = "AdditionalProperties";

    // on tab reload, do nothing?
    if (load_state == load_state_enum.TAB) {
    };

    // on first load, populate available tree
    if (load_state == load_state_enum.LOAD) {
      // available tree
      $scope.capabilities_available_tree = [];
      $scope.capabilities_available_description = "";
      $scope.capabilities_available_loading = true;
      $scope.capabilities_available_load_error = "";

      var available_load_failure_handler = function(data, status, headers, config) {
        $scope.capabilities_available_loading = false;
        $scope.capabilities_available_load_error = "Data could not be loaded: " + status + " (" + data.message + ")";
      };
      
      var namespaces_loaded_count = 0;
      var namespace_callback = function(namespace_data) {
        if (namespace_data) {
          var tree = [];
          angular.forEach(namespace_data, function(namespace) {
            var children_promise = graffitiService.get_capabilities_in_namespace(namespace.namespace, temp_url, temp_token, available_load_failure_handler);
            children_promise.then(function(capability_data) {
              if (capability_data) {
                graffitiService.transform_json_namespaces_to_abn_tree(namespace, capability_data, user_clicks_add, tree);
              }
              if (++namespaces_loaded_count == namespace_data.length) {
                graffitiService.filter_namespaces(tree, namespace_type_mapping, obj_type, "capabilities");
                $scope.capabilities_available_tree = tree;
                $scope.capabilities_available_loading = false;
              };
            }, function(reason) {
            });
          });
        };
      }
      graffitiService.get_namespaces(obj_type, namespace_callback);
    };

    // on load and reload, populate existing tree
    if (load_state == load_state_enum.LOAD || load_state == load_state_enum.RELOAD) {
      // existing tree
      $scope.capabilities_existing_tree = [];
      $scope.capabilities_existing_description = "";
      $scope.capabilities_existing_loading = true;
      $scope.capabilities_existing_load_error = "";

      var existing_load_failure_handler = function(data, status, headers, config) {
        $scope.capabilities_existing_loading = false;
        $scope.capabilities_existing_load_error = "Data could not be loaded: " + status + " (" + data.message + ")";
      };

      var existing_capabilities_promise = graffitiService.get_existing_capabilities(obj_type, $scope.capabilities_obj_id, endpoint_id, service_url, token, existing_load_failure_handler);
      existing_capabilities_promise.then(function(existing_capabilities_data) {
        if (existing_capabilities_data && existing_capabilities_data.capabilities) {
          angular.forEach(existing_capabilities_data.capabilities, function(existing_capability) {
            var branch = {};
            branch.label = existing_capability.capability_type;
            branch.data = {namespace: existing_capability.capability_type_namespace};
            branch.data.properties = [];
            angular.forEach(existing_capability.properties, function(value, key) {
              branch.data.properties.push({name: key, value: value});
            });
            if (branch.data.properties && branch.data.properties.length > 0) {
              branch.onEdit = user_clicks_edit;
            };
            if (branch.data.namespace == default_properties_namespace && branch.label == default_properties_capability_name) {
              for (var i = 0; i < branch.data.properties.length; i++) {
                branch.data.properties[i].type = 'string';
              };
            } else {
              branch.onRemove = user_clicks_remove;
              var properties_promise = graffitiService.get_capability_properties(branch.data.namespace, branch.label, temp_url, temp_token, function(data, status, headers, config) {
                branch.data.properties_loading = false;
                branch.data.properties_load_error = "Data could not be loaded: " + status + " (" + data.message + ")";
              });
              properties_promise.then(function(properties_data) {
                graffitiService.transform_json_properties_to_abn_tree(branch, properties_data);
                branch.data.is_loading_properties = false;
              }, function(reason) {
                branch.data.properties_loading = false;
                branch.data.properties_load_error = reason;
              });
            };
            $scope.capabilities_existing_tree.push(branch);
          });
        };
        $scope.capabilities_existing_loading = false;
      });

      // other load stuff
      $scope.capabilities_edit_open = false;
    };

    if (load_state == load_state_enum.RELOAD) {
      graffitiService.filter_namespaces($scope.capabilities_available_tree, namespace_type_mapping, obj_type, "capabilities");
    };

    var user_clicks_add = function(branch) {
      var new_branch = angular.copy(branch);
      new_branch.onAdd = null;
      new_branch.children = null;
      $scope.capabilities_existing_tree.push(new_branch);
      if (new_branch.data.namespace != default_properties_namespace || new_branch.label != default_properties_capability_name) {
        new_branch.onRemove = user_clicks_remove;
      };
      if (!branch.data.properties_loaded) {
        new_branch.data.properties_is_loading = true;
        new_branch.data.properties_load_error = "";
        var properties_promise = graffitiService.get_capability_properties(branch.data.namespace, branch.label, temp_url, temp_token, function(data, status, headers, config) {
          new_branch.data.properties_is_loading = false;
          new_branch.data.properties_load_error = "Data could not be loaded: " + status + " (" + data.message + ")";
        });
        properties_promise.then(function(properties_data) {
          graffitiService.transform_json_properties_to_abn_tree(new_branch, properties_data);
          graffitiService.transform_json_properties_to_abn_tree(branch, properties_data);
          branch.data.properties_loaded = true;
          new_branch.data.properties_is_loading = false;
          if (new_branch.data.properties && new_branch.data.properties.length > 0) {
            new_branch.onEdit = user_clicks_edit;
          };
        }, function(reason) {
          new_branch.data.properties_is_loading = false;
          new_branch.data.properties_load_error = reason;
        });
      } else {
        if (new_branch.data.properties && new_branch.data.properties.length > 0) {
          new_branch.onEdit = user_clicks_edit;
        };
      };
      $scope.capabilities_edit_open = false;
    };

    var user_clicks_remove = function(branch) {
      for (var i = 0; i < $scope.capabilities_existing_tree.length; i++) {
        if ($scope.capabilities_existing_tree[i].label == branch.label) {
          $scope.capabilities_existing_tree.splice(i,1);
          break;
        };
      };
    };

    var user_clicks_edit = function(branch) {
      $scope.capabilities_branch_in_edit = branch;
      // save a copy of the original values in case of cancel
      $scope.capabilities_branch_in_edit_properties_orig = angular.copy(branch.data.properties);
      $scope.capabilities_edit_open = true;
    };

    $scope.save_capability_property_data = function() {
      $scope.capabilities_edit_open = false;
      var data = $scope.capabilities_branch_in_edit.data.properties;
      for (var i = 0; i < data.length; i++) {
        console.log("PROPERTY: " + data[i].name + "=" + data[i].value);
      }
      console.log($scope.capabilities_existing_tree);
    };

    $scope.cancel_capability_property_data_edit = function() {
      if ($scope.capabilities_branch_in_edit != null) {
        $scope.capabilities_branch_in_edit.data.properties = angular.copy($scope.capabilities_branch_in_edit_properties_orig);
      }
      $scope.capabilities_edit_open = false;
    };

    $scope.detect_validity_errors = function(property_value) {
      return graffitiService.detect_validity_errors(property_value);
    };

    var unregister = function() {
      console.log("Sorry, unregister isn't set yet");
    };

    var unregister = $scope.$on('graffiti:saved', function() {
      var data = {};
      data["id"] = $scope.capabilities_obj_id;
      data["type"] = obj_type;
      data["name"] = obj_name;
      data["provider"] = {};
      data["provider"]["id"] = endpoint_id;
      data["properties"] = {};
      data["capabilities"] = [];
      data["requirements"] = [];

      angular.forEach($scope.capabilities_existing_tree, function(capability) {
        var data_properties = {};
        data_properties["capability_type_namespace"] = capability.data.namespace;
        data_properties["capability_type"] = capability.label;
        data_properties["properties"] = {};
        if (capability.data.properties) {
          angular.forEach(capability.data.properties, function(property) {
            if (property.value == null) {
              property.value = "";
            };
	    data_properties["properties"][property.name] = property.value.toString();
          });
        };
        data["capabilities"].push(data_properties);
      });

      var put_promise = graffitiService.put_capabilities($scope.capabilities_obj_id, data, service_url, token, function(data, status, headers, config) {
        console.log("ERROR DURING PUT: " + status);
        unregister();
      });
      // reset for next open
      put_promise.then(function(data) {
        $scope.capabilities_obj_id = -1;
        unregister();
      });

    });

    $scope.$on('graffiti:canceled', function() {
      // reset for next open
      $scope.capabilities_obj_id = -1;
    });
  }
]);
