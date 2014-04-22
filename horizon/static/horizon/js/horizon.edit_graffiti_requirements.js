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
angular.module('hz').directive('editGraffitiRequirements',
  function() {
    return {
      restrict: 'AEC',
      replace: true,
      templateUrl: '/static/horizon/js/angular/graffiti/partials/edit_graffiti_requirements.html',
      controller: 'EditGraffitiRequirementsController',
    }
  })
.controller('EditGraffitiRequirementsController',
            ['$scope', '$rootScope', '$http', '$q', '$timeout', 'graffitiService',

  function ($scope, $rootScope, $http, $q, $timeout, graffitiService) {
    'use strict';

    $scope.requirements_tree = {}
    $scope.selected_requirements_tree = {}

    // instance-specific data from python
    var token = JSON.stringify($(".django_data_holder").data('token'));
    var obj_type = $(".django_data_holder").data('obj-type');
    var obj_id = $(".django_data_holder").data('obj-id');
    var service_url = $(".django_data_holder").data('service-url');
    var namespace_type_mapping = $(".django_data_holder").data('namespace-type-mapping');


    // set on every load (when tab is opened or re-opened)
    $scope.requirements_is_loading_properties = false;
    $scope.requirements_edit_open = false;
    $scope.requirements_chosen_available_description = "";
    $scope.requirements_chosen_selected_description = "";

    if (!$scope.available_requirements) {
      // set if this is the first load
      $scope.available_requirements = [];
      $scope.selected_requirements = [];
      $scope.is_loading_requirements_namespaces = true;
      $scope.is_loading_existing_requirements = true;
      var first_load = true;
      var available_operators = [];
    } else {
      // set if this is a subsequent load
      var first_load = false;
    };

    $scope.requirements_available_handler = function(branch) {
      $scope.requirements_chosen_available_description = branch.description;
    };

    $scope.requirements_selected_handler = function(branch) {
      $scope.requirements_chosen_selected_description = branch.description;
    };

    var user_clicks_add = function(branch) {
      var requirement = {};
      requirement.label = branch.label;
      requirement.data = angular.copy(branch.data);
      requirement.description = branch.description;
      requirement.onRemove = user_clicks_remove;
      requirement.onEdit = user_clicks_edit;
      $scope.selected_requirements.push(requirement);
      $scope.requirements_edit_open = false;
    };

    var user_clicks_remove = function(branch) {
      for (var i = 0; i < $scope.selected_requirements.length; i++) {
        if ($scope.selected_requirements[i].label == branch.label) {
          $scope.selected_requirements.splice(i,1);
          $scope.requirements_chosen_selected_description = "";
          break;
        };
      };
    };

    var user_clicks_edit = function(branch) {
      if (!branch.data.properties) {
        $scope.requirements_is_loading_properties = true;
        $scope.requirements_properties_load_error = "";

        var operators_promise = graffitiService.get_property_operators(service_url, token, function(data, status, headers, config) {
          $scope.requirements_is_loading_properties = false;
          $scope.requirements_properties_load_error = status + " (" + data.message + ")";
        });

        operators_promise.then(function(operators_data) {
          if (operators_data) {
            available_operators = [];

            for (var i=0; i<operators_data.length; i++) {
                var item = operators_data[i];

                var cur_operator = {};
                cur_operator.type = item.constraint;
                cur_operator.items = item.operators;

                available_operators.push(cur_operator);
            }
          };
        });

        var get_operator = function(type) {
            for (var i=0; i<available_operators.length; i++) {
                if (available_operators[i].type == type) {
                    return available_operators[i];
                }
            }

            return null;
        };

        var properties_promise = graffitiService.get_capability_properties(branch.data.namespace, branch.label, service_url, token, function(data, status, headers, config) {
          $scope.requirements_is_loading_properties = false;
          $scope.requirements_properties_load_error = status + " (" + data.message + ")";
        });

        properties_promise.then(function(properties_data) {
          if (properties_data) {
            var output = [];
            if (properties_data.properties) {
              angular.forEach(properties_data.properties, function(value, key) {
                if (value && key) {
                  var type = value.type;

                  if (value.confidential) {
                    value.type = "confidential";
                  }

                  value.name = key;
                  value.value =  "";
                  value.operator = get_operator(type);
                  value.is_duplicate = false;
                  value.required = true;
                  output.push(value);
                };
              });
            };

            if (properties_data.derived_properties) {
              angular.forEach(properties_data.derived_properties, function(value, key) {
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
                  output.push(value);
                };
              });
            };

            $scope.selected_requirement = branch;
            $scope.selected_requirement.data.properties = output;
            // save a copy of the original values in case of cancel
            $scope.selected_requirement_properties_orig = angular.copy($scope.selected_requirement.data.properties);
          };
          $scope.requirements_is_loading_properties = false;
        }, function(reason) {
          $scope.requirements_is_loading_properties = false;
          $scope.requirements_load_properties_failed = reason;
        });
      } else {
        $scope.selected_requirement = branch;
        // save a copy of the original values in case of cancel
        $scope.selected_requirement_properties_orig = angular.copy($scope.selected_requirement.data.properties);
      };
      $scope.requirements_edit_open = true;
    };

    $scope.save_requirement_property_data = function() {
      $scope.requirements_edit_open = false;
      var data = $scope.selected_requirement.data.properties;
      for (var i=0; i<data.length; i++) {
          console.log("PROPERTY: " + data[i].name + "=" + data[i].value);
      }
      console.log($scope.selected_requirements);
    };

    $scope.cancel_requirement_property_data_edit = function() {
      if ($scope.selected_requirement != null) {
        $scope.selected_requirement.data.properties = angular.copy($scope.selected_requirement_properties_orig);
      }

      $scope.requirements_edit_open = false;
    };

    if (first_load) {
      var namespaces_loaded_count = 0;
      $scope.requirements_namespaces_load_error = "";
      var namespace_promise = graffitiService.get_namespaces(service_url, token, function(data, status, headers, config) {
        $scope.is_loading_requirements_namespaces = false;
        $scope.requirements_namespaces_load_error = status + " (" + data.message + ")";});
      namespace_promise.then(function(namespace_data) {
        var output = []
        angular.forEach(namespace_data, function(namespace) {
          $scope.requirements_namespaces_load_error = "";
          var children_promise = graffitiService.get_capabilities_in_namespace(namespace.namespace, service_url, token, function(data, status, headers, config) {
            $scope.is_loading_requirements_namespaces = false;
            $scope.requirements_namespaces_load_error = status + " (" + data.message + ")";
          });
          children_promise.then(function(requirement_data) {
            var r_data = angular.copy(requirement_data);
            graffitiService.transform_json_namespaces_to_abn_tree(namespace, r_data, user_clicks_add, output);
            if (++namespaces_loaded_count == namespace_data.length) {
              graffitiService.filter_namespaces(output, namespace_type_mapping, obj_type, "requirements");
              $scope.available_requirements = output;
              $scope.is_loading_requirements_namespaces = false;
              // TODO(heather): Take this line out!
              $scope.is_loading_existing_requirements = false;
            };
          }, function(reason) {
          });
        });
      }, function(reason) {
      });
    } else {
      graffitiService.filter_namespaces($scope.available_requirements, namespace_type_mapping, obj_type, "requirements");
    };

    $scope.$on('graffiti:saved', function() {
      console.log('edit controller save');
    });

    var get_property_base_name = function(name) {
        var return_value = name;

        var left_paren = name.indexOf('(');
        if (left_paren >= 0) {
            return_value = return_value.substr(0, left_paren-1);
        }

        return return_value;
    };

    var get_duplicate_id = function(name) {
        var return_value = '0';

        var left_paren = name.indexOf('(');
        var right_paren = name.indexOf(')');
        if (left_paren >= 0 && right_paren >= 0) {
            var len = right_paren - (left_paren+1);
            return_value = name.substr(left_paren+1, len);
        }

        return return_value;
    };

    var get_next_duplicate_id = function(property) {
        // When we make a copy, we have to give it a unique name...
        // I'm currently thinking along the lines of:
        //
        // Property 1
        // Property 1 (1)
        // Property 1 (2)
        // ...
        var return_value = 1;

        var base_name = get_property_base_name(property.name);
        var type = property.type;

        var properties = $scope.selected_requirement.data.properties;

        for (var i=properties.length-1; i>=0; i--) {
            if (properties[i].name.indexOf(base_name) == 0) {
                var id = get_duplicate_id(properties[i].name);
                return_value = parseInt(id) + 1;
                break;
            }
        }

        return return_value;
    };

    $scope.add_duplicate_row_clicked = function(selected_obj) {
        var property = {}
        
        property.name = selected_obj.name;
        property.type = selected_obj.type;
        property.description = selected_obj.description;
        property.operator = angular.copy(selected_obj.operator);
        property.items = selected_obj.items;
        property.is_duplicate = true;

        var base_name = get_property_base_name(property.name);

        var properties = $scope.selected_requirement.data.properties;

        for (var i=properties.length-1; i>=0; i--) {
            if (properties[i].name.indexOf(base_name) == 0 &&
                property.type == properties[i].type) {

                property.name = base_name +
                                ' (' + 
                                get_next_duplicate_id(property) + 
                                ')';

                properties.splice(i+1, 0, property);

                break;
            }
        }
    };

    $scope.remove_duplicate_row_clicked = function(selected_obj) {
        var name = selected_obj.name;
        var type = selected_obj.type;

        var properties = $scope.selected_requirement.data.properties;

        for (var i=0; i<properties.length; i++) {
            if (name == properties[i].name &&
                type == properties[i].type) {

                properties.splice(i, 1);

                break;
            }
        }

    };
  }
]);
