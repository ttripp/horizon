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
    var token = JSON.stringify($(".django_data_holder").data('token'));
    var obj_type = $(".django_data_holder").data('obj-type');
    var obj_id = $(".django_data_holder").data('obj-id');
    var service_url = $(".django_data_holder").data('service-url');
    var namespace_type_mapping = $(".django_data_holder").data('namespace-type-mapping');

    // set on every load (when tab is opened or re-opened)
    $scope.is_loading_properties = false;
    $scope.edit_open = false;
    $scope.chosen_available_description = "";
    $scope.chosen_selected_description = "";

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

    $scope.available_handler = function(branch) {
      $scope.chosen_available_description = branch.description;
    };

    $scope.selected_handler = function(branch) {
      $scope.chosen_selected_description = branch.description;
    };

    var user_clicks_add = function(branch) {
      var capability = {};
      capability.label = branch.label;
      capability.data = angular.copy(branch.data);
      capability.description = branch.description;
      capability.onRemove = user_clicks_remove;
      capability.onEdit = user_clicks_edit;
      $scope.selected_capabilities.push(capability);
      $scope.edit_open = false;
    };

    var user_clicks_remove = function(branch) {
      for (var i = 0; i < $scope.selected_capabilities.length; i++) {
        if ($scope.selected_capabilities[i].label == branch.label) {
          $scope.selected_capabilities.splice(i,1);
          $scope.chosen_selected_description = "";
          break;
        };
      };
    };

    var user_clicks_edit = function(branch) {
      if (!branch.data.properties) {
        $scope.is_loading_properties = true;
        $scope.properties_load_error = "";
        var properties_promise = graffitiService.get_capability_properties(branch.data.namespace, branch.label, service_url, token, function(data, status, headers, config) {
          $scope.is_loading_properties = false;
          $scope.properties_load_error = status + " (" + data.message + ")";
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
          $scope.is_loading_properties = false;
        }, function(reason) {
          $scope.is_loading_properties = false;
          $scope.load_properties_failed = reason;
        });
      } else {
        $scope.selected_capability = branch;
        // save a copy of the original values in case of cancel
        $scope.selected_capability_properties_orig = angular.copy($scope.selected_capability.data.properties);
      };
      $scope.edit_open = true;
    };

    $scope.save_capability_property_data = function() {
      $scope.edit_open = false;
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

      $scope.edit_open = false;
    };

    if (first_load) {
      var namespaces_loaded_count = 0;
      $scope.namespaces_load_error = "";
      var namespace_promise = graffitiService.get_namespaces(service_url, token, function(data, status, headers, config) {
        $scope.is_loading_capabilities_namespaces = false;
        $scope.namespaces_load_error = status + " (" + data.message + ")";});
      namespace_promise.then(function(namespace_data) {
        if (namespace_type_mapping) {
          var filtered_namespaces = graffitiService.filter_namespaces(namespace_type_mapping, obj_type, "capabilities");
          for (var i = 0; i < namespace_data.length; i++) {
            namespace_data[i].visible = false;
            for (var j = 0; j < filtered_namespaces.length; j++) {
              if (namespace_data[i].namespace == filtered_namespaces[j]) {
                namespace_data[i].visible = true;
                break;
              }; 
            };
          };
        } else {
          for (var i = 0; i < namespace_data.length; i++) {
            namespace_data[i].visible = true;
          };
        };
        var output = []
        angular.forEach(namespace_data, function(namespace) {
          $scope.namespaces_load_error = "";
          var children_promise = graffitiService.get_capabilities_in_namespace(namespace.namespace, service_url, token, function(data, status, headers, config) {
            $scope.is_loading_capabilities_namespaces = false;
            $scope.namespaces_load_error = status + " (" + data.message + ")";
          });
          children_promise.then(function(capability_data) {
            var c_data = angular.copy(capability_data);
            graffitiService.transform_json_namespaces_to_abn_tree(namespace, c_data, user_clicks_add, output);
            if (++namespaces_loaded_count == namespace_data.length) {
              $scope.is_loading_capabilities_namespaces = false;
              // TODO(heather): Take this line out!
              $scope.is_loading_existing_capabilities = false;
            };
          }, function(reason) {
          });
        });
        $scope.available_capabilities = output;
      }, function(reason) {
      });
    };

    $scope.$on('graffiti:saved', function() {
      console.log('edit controller save');
    });
  }
]);
