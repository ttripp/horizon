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
angular.module('hz').directive('saveCapabilitiesAndRequirements',
  function() {
    return {
      restrict: 'AEC',
      replace: false,
      templateUrl: '/static/horizon/js/angular/graffiti/partials/save_capabilities_and_requirements.html',
      controller: 'SaveCapabilitiesAndRequirementsController',
    }
  })
.controller('SaveCapabilitiesAndRequirementsController',
            ['$scope', '$rootScope',

  function($scope, $rootScope) {
    'use strict';

    $scope.save = function() {
      $rootScope.$broadcast('graffiti:saved');
    };

    $(".modal-footer>.btn-primary").replaceWith($("#btn-save"));
  }
]);
