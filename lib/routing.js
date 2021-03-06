const helpers = require('./helpers');
const path = require('path');

module.exports = async (pathToFolder) => {
    pathToFolder = pathToFolder.split(path.sep).join('/');
    let routes = {};
    let routesCount = 0;

    await helpers.walk(pathToFolder, (fp) => {
        const fullFilePath = fp;
        let parsed = path.parse(fp);
        if (parsed.base != '__index.js') return;
        fp = fp.split(path.sep).join('/');
        fp = fp.substr(pathToFolder.length + 1);

        let fpArray = fp.split('/');
        fpArray.pop();

        if (!fpArray.length) return;

        // If main page "/"
        if (fpArray.length == 1 && fpArray[0] == '__main') {
            routes['/'] = require(fullFilePath);
        } else {
            routes['/' + fpArray.join('/')] = require(fullFilePath);
        }

        routesCount++;
    });

    if (!routesCount) return false;

    return routes;
}