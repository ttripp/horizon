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
      controller: 'EditGraffitiCapabilitiesController',
    }
  })
.controller('EditGraffitiCapabilitiesController',
            ['$scope', '$http', '$q', '$timeout', 'graffitiService',

  function ($scope, $http, $q, $timeout, graffitiService) {
    'use strict';

    $scope.capabilities_tree = {}
    $scope.selected_capabilities_tree = {}

    // instance-specific data from python
    var token = $(".django_data_holder").data('token');
    var service_url = $(".django_data_holder").data('service-url');
    var temp_url = $(".django_data_holder").data('temp-url');
    var temp_token = JSON.stringify($(".django_data_holder").data('temp-token'));
    var obj_type = $(".django_data_holder").data('obj-type');
    var obj_name = $(".django_data_holder").data('obj-name');
    if ($scope.capabilities_obj_id) {
      $scope.capabilities_old_obj_id = angular.copy($scope.capabilities_obj_id);
    };
    $scope.capabilities_obj_id = $(".django_data_holder").data('obj-id');
    var endpoint_id = $(".django_data_holder").data('endpoint-id');
    var namespace_type_mapping = $(".django_data_holder").data('namespace-type-mapping');

    // set on every load (when tab is opened or re-opened)
    $scope.capabilities_is_loading_properties = false;
    $scope.capabilities_edit_open = false;
    $scope.capabilities_chosen_available_description = "";
    $scope.capabilities_chosen_selected_description = "";

    if (($scope.capabilities_old_obj_id && $scope.capabilities_old_obj_id != $scope.capabilities_obj_id) || !$scope.capabilities_old_obj_id) {
      $scope.existing_capabilities_load_error = "";
      var existing_capabilities_promise = graffitiService.get_existing_capabilities(obj_type, $scope.capabilities_obj_id, endpoint_id, service_url, token, function(data, status, headers, config) {
        $scope.is_loading_existing_capabilities = false;
        $scope.existing_capabilities_load_error = status + " (" + data.message + ")";});
      existing_capabilities_promise.then(function(existing_capabilities_data) {
        if (existing_capabilities_data) {
          console.log("got existing capabilities:");
          console.log(existing_capabilities_data);
          // TODO: put existing into selected
        } else {
          console.log("no existing capabilities");
        };
        $scope.is_loading_existing_capabilities = false;
      });
    };

    if (!$scope.available_capabilities) {
      // set if this is the first load
      $scope.available_capabilities = [];
      $scope.selected_capabilities = [];
      $scope.is_loading_capabilities_namespaces = true;
      $scope.is_loading_existing_capabilities = true;
      var first_load = true;
    } else {
      // set if this is a subsequent load
      var first_load = false;
    };

    $scope.capabilities_available_handler = function(branch) {
      $scope.capabilities_chosen_available_description = branch.description;
    };

    $scope.capabilities_selected_handler = function(branch) {
      $scope.capabilities_chosen_selected_description = branch.description;
    };

    var user_clicks_add = function(branch) {
      var capability = {};
      capability.label = branch.label;
      capability.data = angular.copy(branch.data);
      capability.description = branch.description;
      capability.onRemove = user_clicks_remove;
      capability.onEdit = user_clicks_edit;
      $scope.selected_capabilities.push(capability);
      $scope.capabilities_edit_open = false;
    };

    var user_clicks_remove = function(branch) {
      for (var i = 0; i < $scope.selected_capabilities.length; i++) {
        if ($scope.selected_capabilities[i].label == branch.label) {
          $scope.selected_capabilities.splice(i,1);
          $scope.capabilities_chosen_selected_description = "";
          break;
        };
      };
    };

    var user_clicks_edit = function(branch) {
      if (!branch.data.properties) {
        $scope.capabilities_is_loading_properties = true;
        $scope.capabilities_properties_load_error = "";
        var properties_promise = graffitiService.get_capability_properties(branch.data.namespace, branch.label, temp_url, temp_token, function(data, status, headers, config) {
          $scope.capabilities_is_loading_properties = false;
          $scope.capabilities_properties_load_error = status + " (" + data.message + ")";
        });
        properties_promise.then(function(properties_data) {
          if (properties_data) {
            var output = [];
            if (properties_data.properties) {
              angular.forEach(properties_data.properties, function(value, key) {
                if (value && key) {
                  if (value.confidential) {
                    value.type = "confidential";
                  };
                  value.name = key;
                  value.value = value.defaultValue;
                  output.push(value);
                };
              });
            };
            if (properties_data.derived_properties) {
              angular.forEach(properties_data.derived_properties, function(value, key) {
                if (value && key) {
                  if (value.confidential) {
                    value.type = "confidential";
                  };
                  value.name = key;
                  value.value = "";
                  output.push(value);
                };
              });
            };
            $scope.selected_capability = branch;
            $scope.selected_capability.data.properties = output;
            // save a copy of the original values in case of cancel
            $scope.selected_capability_properties_orig = angular.copy($scope.selected_capability.data.properties);
          };
          $scope.capabilities_is_loading_properties = false;
        }, function(reason) {
          $scope.capabilities_is_loading_properties = false;
          $scope.capabilities_load_properties_failed = reason;
        });
      } else {
        $scope.selected_capability = branch;
        // save a copy of the original values in case of cancel
        $scope.selected_capability_properties_orig = angular.copy($scope.selected_capability.data.properties);
      };
      $scope.capabilities_edit_open = true;
    };

    $scope.save_capability_property_data = function() {
      $scope.capabilities_edit_open = false;
      var data = $scope.selected_capability.data.properties;
      for (var i=0; i<data.length; i++) {
          console.log("PROPERTY: " + data[i].name + "=" + data[i].value);
      }
      console.log($scope.selected_capabilities);
    };

    $scope.cancel_capability_property_data_edit = function() {
      if ($scope.selected_capability != null) {
        $scope.selected_capability.data.properties = angular.copy($scope.selected_capability_properties_orig);
      }

      $scope.capabilities_edit_open = false;
    };

    $scope.detect_validity_errors = function(property_value) {
      return graffitiService.detect_validity_errors(property_value);
    };

    if (first_load) {
      var namespaces_loaded_count = 0;
      $scope.capabilities_namespaces_load_error = "";
      var namespace_promise = graffitiService.get_namespaces(temp_url, temp_token, function(data, status, headers, config) {
        $scope.is_loading_capabilities_namespaces = false;
        $scope.capabilities_namespaces_load_error = status + " (" + data.message + ")";});
      namespace_promise.then(function(namespace_data) {
        var output = []
        angular.forEach(namespace_data, function(namespace) {
          $scope.capabilities_namespaces_load_error = "";
          var children_promise = graffitiService.get_capabilities_in_namespace(namespace.namespace, temp_url, temp_token, function(data, status, headers, config) {
            $scope.is_loading_capabilities_namespaces = false;
            $scope.capabilities_namespaces_load_error = status + " (" + data.message + ")";
          });
          children_promise.then(function(capability_data) {
            var c_data = angular.copy(capability_data);
            graffitiService.transform_json_namespaces_to_abn_tree(namespace, c_data, user_clicks_add, output);
            if (++namespaces_loaded_count == namespace_data.length) {
              graffitiService.filter_namespaces(output, namespace_type_mapping, obj_type, "capabilities");
              $scope.available_capabilities = output;
              $scope.is_loading_capabilities_namespaces = false;
              // TODO(heather): Take this line out!
              $scope.is_loading_existing_capabilities = false;
            };
          }, function(reason) {
          });
        });
      }, function(reason) {
      });
    } else {
      graffitiService.filter_namespaces($scope.available_capabilities, namespace_type_mapping, obj_type, "capabilities");
    };

    $scope.$on('graffiti:saved', function() {
      var data = {};
      data["id"] = $scope.capabilities_obj_id;
      data["type"] = obj_type;
      data["name"] = obj_name;
      data["provider"] = {};
      data["provider"]["id"] = endpoint_id;
      data["properties"] = [];
      data["capabilities"] = [];
      data["requirements"] = [];

      angular.forEach($scope.selected_capabilities, function(capability) {
        var data_properties = {};
        data_properties["capability_type_namespace"] = capability.data.namespace;
        data_properties["capability_type"] = capability.label;
        data_properties["properties"] = [];
        if (capability.data.properties) {
          // TODO(heather): fail validation if properties are not loaded?
          angular.forEach(capability.data.properties, function(property) {
            data_properties["properties"].push({"name": property.name, "value": property.value});
          });
        };
        data["capabilities"].push(data_properties);
      });

      var put_promise = graffitiService.put_capabilities($scope.capabilities_obj_id, data, service_url, token, function(data, status, headers, config) {
        console.log("ERROR DURING PUT: " + status);
      });

      $scope.selected_capabilities = [];
      $scope.capabilities_chosen_selected_description = "";
    });
  }
]);
