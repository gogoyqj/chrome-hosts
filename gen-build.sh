files=`ls src/libs/*.js;ls src/*.js;`
cmd="mkdir -p cjs && mkdir -p cjs/libs"
for f in $files;do
    cmd=$cmd" && node_modules/.bin/babel ${f} -o ${f/src/cjs}"
done
cmd=$cmd" && mkdir -p cjs/libs/host-switch-plus && cp -rfp src/libs/host-switch-plus/* cjs/libs/host-switch-plus/"
cmd=${cmd//\//\\/};
cmd=${cmd//&/\\&}
sed -i "" "s/\(\"build\"[ ]*:[ ]*\"\)[^\"]*\"/\1${cmd}\"/g" package.json
