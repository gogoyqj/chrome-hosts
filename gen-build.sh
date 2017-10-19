files=`ls src/libs/*.js;ls src/*.js;`
cmd="mkdir -p cjs && mkdir -p cjs/libs"
for f in $files;do
    cmd=$cmd" && node_modules/.bin/babel ${f} -o ${f/src/cjs}"
done
cmd=$cmd" && mkdir -p cjs/libs/host-switch-plus && cp -rfp src/libs/host-switch-plus/* cjs/libs/host-switch-plus/"
# cmd=$cmd" && node_modules/.bin/babel src/libs/host-switch-plus/js/background.js -o cjs/libs/host-switch-plus/js/background.js"
cmd=${cmd//\//\\/};
cmd=${cmd//&/\\&}
sed -i "" "s/\(\"build\"[ ]*:[ ]*\"\)[^\"]*\"/\1${cmd}\"/g" package.json
