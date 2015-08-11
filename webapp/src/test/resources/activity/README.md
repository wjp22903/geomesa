These files provide an example schema that can be used with the activity plugin.

You might use a script like the following to quickly ingest these example datasets:

```bash
#!/bin/bash

GM="geomesa ingest -c stealth -i instance -u user -p password -st false -z zoo -lat lat -lon lon"
$GM -fn alerts -s 'site_name:String,observation_count:Int,alert_sigmas:Double,dtg:Date,lat:Double,lon:Double,*geom:Point:srid=4326' alerts.csv
$GM -fn sites -s 'lat:Double,lon:Double,site_name:String,*geom:Point:srid=4326' sites.csv
$GM -fn timeseries -s 'lat:Double,lon:Double,site_name:String,dtg:Date,count:Int,is_alert:Boolean,*geom:Point:srid=4326' timeseries.csv
```

After that, set up a store to point at this catalog, and a layer for each of these features.
For convenience, suppose we call the layers alerts, sites, and timeseries, in workspace activity.
After creating the layers, add the following keyword to activity:alerts:
    stealth.activity.Example.sites.layerName=activity:sites
    stealth.activity.Example.timeseries.layerName=activity:timeseries

Additional configuration options are documented in the [activity module](../../../main/ui/src/app/activity/activity.js).