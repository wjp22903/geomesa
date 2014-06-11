# Stealth
Frontend for DragonSpell analytics

### Getting started
1st build: `mvn clean install -Pinstall-nodejs,unpack-ui`

After a nodejs version change: `mvn clean install -Pinstall-nodejs`

After a npm/bower dependency change (with internet): `mvn clean install -Ppack-ui`

Regular development: `mvn clean install`

To run webapp in jetty: `mvn jetty:run -Pdoubletrouble8082`

Notes:
* To 'grunt watch' you must run './node grunt watch' from src/main/ui dir.
* The 'doubletrouble8082' profile configures stealth to use http://doubletrouble:8082/geoserver
  This is currently the low-side stealth-dev geoserver, with the required version of the geomesa plugin.
