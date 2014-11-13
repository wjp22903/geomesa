#!/bin/bash

PASSWORD=password

OUT_DIR=certs

C="US"
ST="Virginia"
L="Charlottesville"
O="CCRI"

CN_CA="CCRI"
CN_SERVER="myserver"
CN_CLIENT1="Guest User guest"
CN_CLIENT2="Blocked User blocked"

mkdir -p ${OUT_DIR}

openssl genrsa -des3 -out ${OUT_DIR}/ca.key -passout pass:${PASSWORD} 4096
openssl req -new -x509 -days 9999 -key ${OUT_DIR}/ca.key -out ${OUT_DIR}/ca.crt -passin pass:${PASSWORD} -subj "/C=${C}/ST=${ST}/L=${L}/O=${O}/CN=${CN_CA}"
keytool -import -trustcacerts -alias caroot -file ${OUT_DIR}/ca.crt -keystore ${OUT_DIR}/truststore.jks -storepass ${PASSWORD} -noprompt

openssl genrsa -des3 -out ${OUT_DIR}/server.key -passout pass:${PASSWORD} 4096
openssl req -new -key ${OUT_DIR}/server.key -out ${OUT_DIR}/server.csr -passin pass:${PASSWORD} -subj "/C=${C}/ST=${ST}/L=${L}/O=${O}/CN=${CN_SERVER}"
openssl x509 -req -days 9999 -in ${OUT_DIR}/server.csr -CA ${OUT_DIR}/ca.crt -CAkey ${OUT_DIR}/ca.key -set_serial 01 -out ${OUT_DIR}/server.crt -passin pass:${PASSWORD}
openssl pkcs12 -export -out ${OUT_DIR}/server.p12 -inkey ${OUT_DIR}/server.key -in ${OUT_DIR}/server.crt -passin pass:${PASSWORD} -passout pass:${PASSWORD}

openssl genrsa -des3 -out ${OUT_DIR}/guest.key -passout pass:${PASSWORD} 4096
openssl req -new -key ${OUT_DIR}/guest.key -out ${OUT_DIR}/guest.csr -passin pass:${PASSWORD} -subj "/C=${C}/ST=${ST}/L=${L}/O=${O}/CN=${CN_CLIENT1}"
openssl x509 -req -days 9999 -in ${OUT_DIR}/guest.csr -CA ${OUT_DIR}/ca.crt -CAkey ${OUT_DIR}/ca.key -set_serial 02 -out ${OUT_DIR}/guest.crt -passin pass:${PASSWORD}
openssl pkcs12 -export -out ${OUT_DIR}/guest.p12 -inkey ${OUT_DIR}/guest.key -in ${OUT_DIR}/guest.crt -passin pass:${PASSWORD} -passout pass:${PASSWORD}

openssl genrsa -des3 -out ${OUT_DIR}/blocked.key -passout pass:${PASSWORD} 4096
openssl req -new -key ${OUT_DIR}/blocked.key -out ${OUT_DIR}/blocked.csr -passin pass:${PASSWORD} -subj "/C=${C}/ST=${ST}/L=${L}/O=${O}/CN=${CN_CLIENT2}"
openssl x509 -req -days 9999 -in ${OUT_DIR}/blocked.csr -CA ${OUT_DIR}/ca.crt -CAkey ${OUT_DIR}/ca.key -set_serial 02 -out ${OUT_DIR}/blocked.crt -passin pass:${PASSWORD}
openssl pkcs12 -export -out ${OUT_DIR}/blocked.p12 -inkey ${OUT_DIR}/blocked.key -in ${OUT_DIR}/blocked.crt -passin pass:${PASSWORD} -passout pass:${PASSWORD}
