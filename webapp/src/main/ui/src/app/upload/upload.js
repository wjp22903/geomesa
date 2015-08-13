/*
 * This module provides the ability to upload a csv as a GeoMesa layer, using
 * either the geomesa:IngestCSV or geomesa:UserLockingIngestCSV process. The process identifier
 * is configurable via the "upload.process" key of the Stealth configuration, defaulting
 * to geomesa:IngestCSV if no key is present. For installation and configuration of these
 * processes, consult analyticwps-importcsv{-secure} (and, for the secure version, gs-ext-userroles).
 */

angular.module('stealth.upload', [
    'stealth.upload.wizard'
])
;
