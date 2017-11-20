const fs = require('fs');
const path = require('path');

module.exports = {
    walk: (currentDirPath, callback, endWalkCallback) => {
        let dirs = 0;

        function walk(currentDirPath, callback, endWalkCallback) {
            dirs++;
            fs.readdir(currentDirPath, (err, files) => {
                if (err) {
                    throw new Error(err);
                }

                let iterations = 0;

                files.forEach((name) => {
                    let filePath = path.join(currentDirPath, name);
                    iterations++;
                    fs.stat(filePath, (err, stat) => {
                        iterations--;
                        if (err) {
                            endWalkCallback(false);
                            console.warn(err);
                            return false;
                        } else {
                            if (stat.isFile()) {
                                callback(filePath, stat);
                            } else if (stat.isDirectory()) {
                                walk(filePath, callback, endWalkCallback);
                            }
                        }

                        if (iterations == 0) dirs--;
                        if (iterations == 0 && dirs == 0) endWalkCallback();
                    });
                });
            });
        }

        walk(currentDirPath, callback, endWalkCallback);
    },
    forEach: function (object, callback) {
        if (typeof callback !== 'function') return false;
        for (let key in object) {
            if (object.hasOwnProperty(key)) callback(key, object[key]);
        }
    }
}