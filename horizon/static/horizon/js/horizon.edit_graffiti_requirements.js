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
            ['$scope', '$http', '$q', '$timeout', 'graffitiService',

  function ($scope, $http, $q, $timeout, graffitiService) {
    'use strict';

    /**
     * tree controls
     */
    // available tree
    $scope.requirements_available_tree_control = {}
    // branch is selected in available tree
    $scope.requirements_available_branch_select_handler = function(branch) {
      $scope.requirements_available_description = branch.description;
    };
    // available tree is loading
    $scope.requirements_available_is_loading = function() {
      return $scope.requirements_available_loading;
    };
    // available tree had an error
    $scope.requirements_available_is_error = function() {
      if (!$scope.requirements_available_loading) {
        if ($scope.requirements_available_load_error) {
          return true;
        }
      }
      return false;
    };
    // available tree error text
    $scope.requirements_available_get_error_text = function() {
      return $scope.requirements_available_load_error;
    };

    // existing tree
    $scope.requirements_existing_tree_control = {}
    // branch is selected in existing tree
    $scope.requirements_existing_branch_select_handler = function(branch) {
      $scope.requirements_existing_description = branch.description;
    };
    // existing tree is loading
    $scope.requirements_existing_is_loading = function() {
      return $scope.requirements_existing_loading;
    };
    // existing tree had an error
    $scope.requirements_existing_is_error = function() {
      if (!$scope.requirements_existing_loading) {
        if ($scope.requirements_existing_load_error) {
          return true;
        };
      };
      return false;
    };
    // existing tree error text
    $scope.requirements_existing_get_error_text = function() {
      return $scope.requirements_existing_load_error;
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
    var namespace_type_mapping = $(".django_data_holder").data('namespace-type-mapping');
    var load_state = load_state_enum.LOAD;
    if ($scope.requirements_obj_id) {
      load_state = load_state_enum.TAB;
      var old_obj_id = angular.copy($scope.requirements_obj_id);
    };
    $scope.requirements_obj_id = $(".django_data_holder").data('obj-id').toString();
    if (old_obj_id && old_obj_id != $scope.requirements_obj_id) {
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
      $scope.requirements_available_tree = [];
      $scope.requirements_available_description = "";
      $scope.requirements_available_loading = true;
      $scope.requirements_available_load_error = "";

      var available_load_failure_handler = function(data, status, headers, config) {
        $scope.requirements_available_loading = false;
        $scope.requirements_available_load_error = "Data could not be loaded: " + status + " (" + data.message + ")";
      };

      var namespaces_loaded_count = 0;
      var namespace_promise = graffitiService.get_namespaces(temp_url, temp_token, available_load_failure_handler);
      namespace_promise.then(function(namespace_data) {
        if (namespace_data) {
          var tree = []
          angular.forEach(namespace_data, function(namespace) {
            var children_promise = graffitiService.get_capabilities_in_namespace(namespace.namespace, temp_url, temp_token, available_load_failure_handler);
            children_promise.then(function(requirement_data) {
              if (requirement_data) {
                graffitiService.transform_json_namespaces_to_abn_tree(namespace, requirement_data, user_clicks_add, tree);
              };
              if (++namespaces_loaded_count == namespace_data.length) {
                graffitiService.filter_namespaces(tree, namespace_type_mapping, obj_type, "requirements");
                $scope.requirements_available_tree = tree;
                $scope.requirements_available_loading = false;
              };
            }, function(reason) {
            });
          });
        };
      }, function(reason) {
      });

      var operators_promise = graffitiService.get_property_operators(temp_url, temp_token, available_load_failure_handler);
      operators_promise.then(function(operators_data) {
        if (operators_data) {
          $scope.available_operators = [];
          for (var i = 0; i < operators_data.length; i++) {
            var item = operators_data[i];
            var cur_operator = {type: item.constraint, items: item.operators};
            $scope.available_operators.push(cur_operator);
          };
        };
      }, function(reason) {
      });
    };

    // on load and reload, populate existing tree
    if (load_state == load_state_enum.LOAD || load_state == load_state_enum.RELOAD) {
      // existing tree
      $scope.requirements_existing_tree = [];
      $scope.requirements_existing_description = "";
      $scope.requirements_existing_loading = true;
      $scope.requirements_existing_load_error = "";

      var existing_load_failure_handler = function(data, status, headers, config) {
        $scope.requirements_existing_loading = false;
        $scope.requirements_existing_load_error = "Data could not be loaded: " + status + " (" + data.message + ")";
      };

      var existing_requirements_promise = graffitiService.get_existing_capabilities(obj_type, $scope.requirements_obj_id, endpoint_id, service_url, token, existing_load_failure_handler);
      existing_requirements_promise.then(function(existing_requirements_data) {
        if (existing_requirements_data) {
          angular.forEach(existing_requirements_data.requirements, function(existing_requirement) {
            var branch = {};
            branch.label = existing_requirement.capability_type;
            branch.data = {namespace: existing_requirement.capability_type_namespace};
            branch.data.properties = [];
            angular.forEach(existing_requirement.properties, function(value, key) {
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
            $scope.requirements_existing_tree.push(branch);
          });
        };
        $scope.requirements_existing_loading = false;
      });

      // other load stuff
      $scope.requirements_edit_open = false;
    };

    if (load_state == load_state_enum.RELOAD) {
      graffitiService.filter_namespaces($scope.requirements_available_tree, namespace_type_mapping, obj_type, "requirements");
    };

    var user_clicks_add = function(branch) {
      var new_branch = angular.copy(branch);
      new_branch.onAdd = null;
      new_branch.children = null;
      $scope.requirements_existing_tree.push(new_branch);
      if (new_branch.data.namespace != default_properties_namespace || new_branch.label != default_properties_capability_name) {
        new_branch.onRemove = user_clicks_remove;
      };
      if (!branch.data.properties_loaded) {
        new_branch.data.properties_is_loading = true;
        new_branch.data.properties_load_error = "";
        var properties_promise = graffitiService.get_capability_properties(branch.data.namespace, branch.label, temp_url, temp_token, function(data, status, headers, config) {
          new_branch.data.is_loading_properties = false;
          new_branch.data.properties_load_error = "Data could not be loaded: " + status + " (" + data.message + ")";
        });
        properties_promise.then(function(properties_data) {
          graffitiService.transform_json_requirement_properties_to_abn_tree(new_branch, properties_data, $scope.available_operators);
          graffitiService.transform_json_requirement_properties_to_abn_tree(branch, properties_data, $scope.available_operators);
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
      $scope.requirements_edit_open = false;
    };

    var user_clicks_remove = function(branch) {
      for (var i = 0; i < $scope.requirements_existing_tree.length; i++) {
        if ($scope.requirements_existing_tree[i].label == branch.label) {
          $scope.requirements_existing_tree.splice(i,1);
          break;
        };
      };
    };

    var user_clicks_edit = function(branch) {
      $scope.requirements_branch_in_edit = branch;
      // save a copy of the original values in case of cancel
      $scope.requirements_branch_in_edit_properties_orig = angular.copy(branch.data.properties);
      $scope.requirements_edit_open = true;
    };

    $scope.save_requirement_property_data = function() {
      $scope.requirements_edit_open = false;
      var data = $scope.requirements_branch_in_edit.data.properties;
      for (var i = 0; i < data.length; i++) {
          console.log("PROPERTY: " + data[i].name + "=" + data[i].value);
      }
      console.log($scope.requirements_existing_tree);
    };

    $scope.cancel_requirement_property_data_edit = function() {
      if ($scope.requirements_branch_in_edit != null) {
        $scope.requirements_branch_in_edit.data.properties = angular.copy($scope.requirements_branch_in_edit_properties_orig);
      }
      $scope.requirements_edit_open = false;
    };

    $scope.detect_validity_errors = function(property_value) {
      return graffitiService.detect_validity_errors(property_value);
    };

    $scope.$on('graffiti:saved', function() {
      $scope.requirements_obj_id = -1;
      console.log('edit requirements save');
      // TODO(heather): implement save
    });

    $scope.$on('graffiti:canceled', function() {
      // reset for next open
      $scope.requirements_obj_id = -1;
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

      var properties = $scope.requirements_branch_in_edit.data.properties;

      for (var i = properties.length - 1; i >= 0; i--) {
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

      var properties = $scope.requirements_branch_in_edit.data.properties;

      for (var i = properties.length - 1; i >= 0; i--) {
        if (properties[i].name.indexOf(base_name) == 0 &&
            property.type == properties[i].type) {

          property.name = base_name + ' (' + get_next_duplicate_id(property) + ')';
          properties.splice(i+1, 0, property);
          break;
        }
      }
    };

    $scope.remove_duplicate_row_clicked = function(selected_obj) {
      var name = selected_obj.name;
      var type = selected_obj.type;

      var properties = $scope.requirements_branch_in_edit.data.properties;

      for (var i = 0; i < properties.length; i++) {
        if (name == properties[i].name &&
            type == properties[i].type) {

          properties.splice(i, 1);
          break;
        }
      }
    };
  }
]);
