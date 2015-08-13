/**
 * After uploading a file, the user is asked to double-check the schema, and update it as necessary.
 * This module provides support for this step.
 */
angular.module('stealth.upload.wizard.schema', [
    'stealth.core.utils',
    'stealth.core.wizard',
    'stealth.upload.wizard.types'
])

.factory('stealth.upload.wizard.schema.StepFactory', [
'stealth.core.utils.WidgetDef',
'stealth.core.wizard.Step',
function (WidgetDef, Step) {
    var self = {
        createStep: function (wizardScope, setup, teardown) {
            var widget = new WidgetDef('st-up-wiz-schema', wizardScope);
            return new Step('Select Schema', widget, null, true, setup, teardown);
        }
    };
    return self;
}])

/**
 * This service understands how to talk to the backend 'types' endpoint.
 * That is, it knows how to query for the backend's current understanding of the schema associated with
 * an uploaded file, and how to post changes to that schema.
 */
.service('stealth.upload.wizard.schema.typesService', [
'$http',
'stealth.upload.wizard.types.attributeTypeService',
function ($http, attributeTypeService) {
    var completeUrl = function (baseUrl, uuid) {
        return baseUrl + "/" + uuid + "/types";
    };
    var parseGetResponse = function (data) {
        var parts = data.split('\n');
        var featureName = parts[0];
        var featureSchema = _.map(parts[1].split(','), function (attribute) {
            var sep = attribute.indexOf(':');
            var name = attribute.substring(0, sep);
            if (name.indexOf('*') === 0) {
                name = name.substring(1);
            }
            var binding = attribute.substring(sep + 1);
            if (binding.indexOf(':') !== -1) {
                binding = binding.substring(0, binding.indexOf(':'));
            }
            return {name: name, binding: binding};
        });
        return {
            featureName: featureName,
            featureSchema: featureSchema
        };
    };

    /**
     * Ask the server for the current schema for an uploaded file (given by uuid)
     */
    this.getType = function (baseUrl, uuid, onSuccess, onFailure) {
        $http.get(completeUrl(baseUrl, uuid))
            .then(
                function (response) {
                    var parsedResponse = parseGetResponse(response.data);
                    onSuccess(parsedResponse.featureName, parsedResponse.featureSchema);
                },
                function (response) {
                    onFailure(response.data, response.status);
                }
            );
    };

    var schemaString = function (name, binding) {
        return name + ":" + binding;
    };
    var geomSchemaString = function (name, binding, isDefault) {
        return (isDefault ? "*" : "") + schemaString(name, binding) + ":srid=4326";
    };
    var encodePayload = function (payloadObj) {
        return _.map(_.keys(payloadObj), function (key) {
            return key + "=" + encodeURIComponent(payloadObj[key]);
        }).join("&");
    };
    /**
     * We expect typeParameters to have the following shape:
     *  typeParameters = {
     *    name: String
     *    schema: [ { name: String, binding: string } ]
     *    geom: {
     *      type: String // either latlon or geom
     *      geomName: String // for type geom
     *      latName: String // for lat
     *      lonName: String // for lon
     *    }
     *  }
     * From this data, we post the update to the backend to update the schema of the uploaded file given by uuid
     */
    this.updateType = function (baseUrl, uuid, typeParameters, onSuccess, onFailure) {
        var payload = {name: typeParameters.name};
        if (typeParameters.geom.type === "geom") {
            payload.schema = _.map(typeParameters.schema, function (value) {
                if (value.name === typeParameters.geom.geomName) {
                    return geomSchemaString(value.name, value.binding, true);
                } else if (attributeTypeService.isGeom(value.binding)) {
                    return geomSchemaString(value.name, value.binding, false);
                } else {
                    return schemaString(value.name, value.binding);
                }
            }).join(",");
        } else {
            payload.schema = _.map(typeParameters.schema, function (value) {
                return schemaString(value.name, value.binding);
            }).join(",") + "," + geomSchemaString("geom", "Point", true);
            payload.latField = typeParameters.geom.latName;
            payload.lonField = typeParameters.geom.lonName;
        }
        $http({
            method: 'POST',
            url: completeUrl(baseUrl, uuid),
            data: encodePayload(payload),
            headers: {'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8'}
        })
        .then(onSuccess, onFailure);
    };
}])

/**
 * Controller for the stUpWizSchema, which is the directive associated with the schema Step of the upload Wizard
 */
.controller('stealth.upload.wizard.schema.Controller', [
'$scope',
'stealth.upload.wizard.schema.typesService',
function ($scope, typesService) {
    var getType = function () {
        typesService.getType(
            $scope.file.proxy + $scope.file.baseUri,
            $scope.file.uuid,
            function (featureName, featureSchema) {
                $scope.file.feature = featureName;
                $scope.file.schema = featureSchema;
            },
            function (failureMessage) {
                $scope.loadError = failureMessage;
            }
        );
    };
    $scope.loadError = null;
    getType();
}])

.directive('stUpWizSchema',
function () {
    return {
        restrict: 'E',
        controller: 'stealth.upload.wizard.schema.Controller',
        templateUrl: 'upload/wizard/templates/schema.tpl.html'
    };
})
;
