angular.module('stealth.grizzlybear.geo.query', [
])

.service('stealth.grizzlybear.geo.query.CQLGenerator', [function () {
    //currently dates auto convert to ISOStrings which is best practice for date passing
    //if you want to pass something else then manually convert before passing
    //to this function
    var me = this;

    this.appendRangeQuery = function (cql, filters) {
        var result = cql || '';

        return _.reduce(filters, function (cqlQuery, filter, featureName) {
            var upper, lower, query;
            if (filter.length > 0) {
                if (filter[0] !== void(0) && filter[0] !== null) {
                    lower = moment.isDate(filter[0]) || moment.isMoment(filter[0]) ? filter[0].toISOString() : filter[0];
                }

                if (filter.length > 1 && filter[1] !== void(0) && filter[1] !== null) {
                    upper = moment.isDate(filter[1]) || moment.isMoment(filter[1]) ? filter[1].toISOString() : filter[1];
                }
            }

            if (upper !== void(0) && lower !== void(0)) {
                query = '(' +
                    featureName + ' between ' +
                    lower + ' AND ' + upper +
                    ')';
            } else if (upper !== void(0)) {
                query = '(' +
                    featureName + ' < ' + upper +
                    ')';
            } else if (lower !== void(0)) {
                query = '(' +
                    featureName + '>' + lower +
                    ')';
            }

            if (query) {
                if (cqlQuery.length > 0) {
                    cqlQuery = cqlQuery + ' AND ' + query;
                } else {
                    cqlQuery = query;
                }
            }


            return cqlQuery;
        }, result);
    };

    this.appendEqualityQuery = function (cql, filter) {
        var result = cql || '';
        return _.reduce(filter, function (cqlQuery, filter, featureName) {
            var query,
                values,
                fNames,
                fnAndValues,
                subQuery,
                i;

            fNames = featureName.split(",");
            switch (Object.prototype.toString.call(filter.value)) {
                case '[object Array]':
                    if (filter.value.length > 0) {
                        query = '(' +
                            filter.value.map(function (filter) {
                                fnAndValues = [];
                                values = filter.split(",");
                                for (i = 0; i < fNames.length; i++) {
                                    fnAndValues.push([fNames[i], values[i]]);
                                }

                                subQuery = '(' +
                                    fnAndValues.map(function (fv) {
                                        return fv[0] + '=\'' +
                                            (moment.isDate(fv[1]) || moment.isMoment(fv[1]) ? fv[1].toISOString() : fv[1]) +
                                            '\'';
                                    }).join(' and ') +
                                    ')';
                                return subQuery;
                            }).join(' or ') +
                            ')';
                    }
                    break;
                default:
                    query = '(' +
                        featureName + '=\'' +
                        (moment.isDate(filter) || moment.isMoment(filter) ? filter.toISOString() : filter) +
                        '\')';
                    break;
            }

            if (query) {
                if (cqlQuery.length > 0) {
                    cqlQuery = cqlQuery + ' AND ' + query;
                } else {
                    cqlQuery = query;
                }
            }
            return cqlQuery;
        }, result);
    };

    this.generate = function (params) {
        return _.reduce(params, function (cqlQuery, filters, filterGroup) {
            switch (filterGroup.toUpperCase()) {
                case 'RANGE':
                    cqlQuery = me.appendRangeQuery(cqlQuery, filters);
                    break;
                case 'EQUALITY':
                    cqlQuery = me.appendEqualityQuery(cqlQuery, filters);
                    break;
                default:
                    console.log('Unknown CQL Filter type: ' + filterGroup.toUpperCase());
            }
            return cqlQuery;
        }, '');
    };

    this.isEmptyFilter = function (filter) {
        var result = true;

        if (filter) {
            _.each(filter, function (filter, filterName) {
                filter.value.map(function (v) {
                    if (v.length > 0) {
                        result = false;
                    }
                });
            });
        }

        return result;
    };
}])
;
