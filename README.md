# Stealth
Frontend for DragonSpell analytics

### Getting started
1st build: `mvn clean install -Pinstall-nodejs,unpack-npm,unpack-bower`

After a nodejs version change: `mvn clean install -Pinstall-nodejs`

After an npm dependency change (with internet): `mvn clean install -Ppack-npm`
After a bower dependency change (with internet): `mvn clean install -Ppack-bower`

Regular development: `mvn clean prepare-package`

To run webapp in jetty: `mvn -pl webapp jetty:run`

Notes:
* To 'grunt watch' you must run './node grunt watch' from src/main/ui dir.
