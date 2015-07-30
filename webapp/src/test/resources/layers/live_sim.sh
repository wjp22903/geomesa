#!/bin/bash
# Run in geoserver data dir to create a simulated live "Air" layer
#     nohup ./live_sim.sh &
#
# Once running, register a Properties store and live_sim layer.

while true; do
    for i in `seq -125 -70`; do
        echo "_=id:String,affiliation:String,course:Double,label:String,subLabel:String,altFt:String,isOld:Boolean,Location:Geometry:srid=4326,lineHist:Geometry:srid=4326" > live_sim.properties
        echo "1=1|UNKNOWN|90|T35T3R|9999|35|false|POINT($i 40)|MULTILINESTRING (($i 40, "$[i-1]" 40), ("$[i-1]" 40, "$[i-2]" 40))" >> live_sim.properties
        sleep 2
    done
done
