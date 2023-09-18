const path = require('path')
const { app, shell, dialog } = require('electron')
const configDir =  app.getPath('userData')
const assetsDir = configDir + path.sep + 'assets'

//load modules
const db_manager = require("./db_manager.js")
const file_manager = require("./file_manager.js")
const request_manager = require("./request_manager.js")
const version_manager = require("./version_manager.js")

async function aaadownloadNewApp(args) {
    return new Promise((resolve, reject) => {
        resolve(true)
    })
}

function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

function extractBaseUrl(content) {
    return new Promise((resolve, reject) => {
        fileContent = content.replace('<?php', '');

        var myarr = fileContent.split("define('");
        for (i = 1, len = myarr.length, text = ""; i < len; i++) { 
            str = myarr[i];

            var firstEight = myarr[i].substring(0, 8);
            var ditchA = `', '`;
            var ditchB = `
`;
            var ditchC = `');`;

            if (firstEight == 'BASE_URL') {
                var rowContent = myarr[i].replace(firstEight, '');
                rowContent = rowContent.replace(ditchA, '');
                rowContent = rowContent.replace(ditchB, '');
                var baseUrl = rowContent.replace(ditchC, '');
                resolve(baseUrl)
            }
        }

    })

}

function setUpDatabaseConf(filePath, dbSettingsObj) {

    return new Promise((resolve, reject) => {
        try {
            var fs  = require("fs")
            fs.appendFileSync(filePath, "<?php" + "\n")
            fs.appendFileSync(filePath, "//Database settings" + "\n")
            for (let [key, value] of Object.entries(dbSettingsObj)) {
                var ucKey = key.toUpperCase()
                var newLine = `define('${ucKey}', '${value}');`
                fs.appendFileSync(filePath, newLine + "\n")
            }
            resolve(true)
        } catch (err) {
            reject(err)
        }

    })    

}

function convertLinesToObject(fileLines) {
    var thisObj = {}
    var count = 0
    for (var i = 0; i < fileLines.length; i++) {
        count++
        var thisLine = fileLines[i]
        thisLine = thisLine.replace('\r', '')

        if (count == 1) {
            var thisKey = thisLine
        } else {
            var thisValue = thisLine

            thisObj[thisKey] = thisValue
            count = 0

        }
    }

    return thisObj
}

function chooseExistingAppLocationLocation() {

    return new Promise((resolve, reject) => {
        dialog.showOpenDialog({
            buttonLabel: 'Modify This App',
            properties: ['openFile', 'openDirectory']
        }).then(openPath => {
            var selectedDir = openPath.filePaths[0];
            var requiredFolders = ['config', 'engine', 'modules', 'public', 'templates']
            var folderPath = ''
            var folderExists = true
            var folders = []
            for (var i = 0; i < requiredFolders.length; i++) {
                folderPath = selectedDir + path.sep + requiredFolders[i]
                folders.push(folderPath)
            }
            //checkFoldersExist(folders, selectedDir)
            resolve(selectedDir);

        }).catch(err => {
            reject(err)
        })

    });
    
}

async function initMinSQL(localFrameworkPath) {
    return true;
}



































































module.exports = {

    chooseExistingAppLocationLocation: async () => {
        var selectedDir = await chooseExistingAppLocationLocation();
        selectedDir = selectedDir.replace(/\\/g, '/');
        return selectedDir;
    },

    fetchAllModules: async (args, includeTGModules) => {
        var localFrameworkPath = args.localFrameworkPath;
        var modulesDir = localFrameworkPath + path.sep + 'modules' + path.sep;

        var allModules = await file_manager.listTheDir(modulesDir).catch((err) => {
            throw err
        })

        if (includeTGModules == false) {

            var foundModules = [];

            for (var i = 0; i < allModules.length; i++) {
                var moduleName = allModules[i];
                var firstChar = moduleName.substring(0,1);
                var targetStr = 'trongate_';
                if (moduleName.length>10) {
                    var strStart = moduleName.substring(0,9);
                    if ((strStart !== targetStr) && (firstChar !== '.')) {
                        foundModules.push(moduleName);
                    }
                } else if (firstChar !== '.') {
                    foundModules.push(moduleName);
                }
                
            }

            return foundModules;

        } else {
            return allModules;
        }

    },

    submitModuleToDelete: async (localFrameworkPath, selectedModule) => {
        var moduleDir = localFrameworkPath + path.sep + 'modules' + path.sep + selectedModule;

        await file_manager.chmodFolderRecursive(moduleDir, '0777')
        .catch((err) => {
            throw err
        })

        await file_manager.deleteFolderRecursive(moduleDir).catch((err) => {
            throw err
        })

        //let's attempt to delete table of the same name...
        var dbConfigFilePath = localFrameworkPath + path.sep + 'config' + path.sep + 'database.php'

        //make sure we have a database.php file 
        var fileExists = await file_manager.doesThisExist(dbConfigFilePath).catch((err) => {
            throw err
        })

        if (fileExists !== true) {
            return;
        }

        var dbConfigContent = await file_manager.readTheFile(dbConfigFilePath).
        catch ((err) => {
            throw err
        })

        var dbSettings = await db_manager.extractDbSettings(dbConfigContent, true).
        catch ((err) => {
            throw err
        })

        var query = 'DROP TABLE IF EXISTS ' + selectedModule;
        await db_manager.executeQuery(query, dbSettings).
        catch ((err) => {
            throw err
        })

        return;
    },

    returnAppBaseUrl: async (localFrameworkPath) => {

        var configFilePath = localFrameworkPath + path.sep + 'config' + path.sep + 'config.php'
        var fileContent = await file_manager.readTheFile(configFilePath).catch((err) => {
            throw err
        })

        var appBaseUrl = await extractBaseUrl(fileContent)
        return appBaseUrl

    },

    isStandardAdminModule: async (newModulePath) => {
        //returns true or false (not perfect - never will be!)

        // TEST 1:  Does module contain some view files that we would expect?
        var score = 0;
        var viewDirPath = newModulePath + path.sep + 'views'
        var requiredViewFiles = ['create.php', 'manage.php'];
        var numRequiredViewFiles = requiredViewFiles.length;

        var viewFiles = await file_manager.listTheDir(viewDirPath).catch((err) => {
            throw err
        })

        for (var x = 0; x < viewFiles.length; x++) {
            var fileName = viewFiles[x];
            var n = requiredViewFiles.includes(fileName);

            if (n == true) {
                score++;
            }

        }

        if (score<numRequiredViewFiles) {
            //this is probably not an admin module
            return false;
        }

        // TEST 2: does the controller file contain a 'manage' method?
        var lastSegment = newModulePath.substring(newModulePath.lastIndexOf('/') + 1);
        var controllerFileName = capitalizeFirstLetter(lastSegment);
        var controllerPath = newModulePath + path.sep + 'controllers' + path.sep + controllerFileName + '.php';

        var controllerContent = await file_manager.readTheFile(controllerPath).catch((err) => {
            return err
        })

        var targetStr = 'function manage()'
        var n = controllerContent.includes(targetStr);

        if (n !== true) {
            //this is probably not an admin module
            return false;
        }

        // TEST 3 (check to see if uses 'admin' template)
        var targetStr2 = '$this->template(\'admin\', $data);';
        var o = controllerContent.includes(targetStr2);

        if (o !== true) {
            //this is probably not an admin module
            return false;
        } else {
            return true; //if we made it this far then we may assume true
        }

    },

    updateDynamicNav: async (localFrameworkPath, moduleDir, manageModuleUrl) => {

        //figure out what the plural is...
        var entityNamePlural = capitalizeFirstLetter(moduleDir);
        entityNamePlural = entityNamePlural.replace(/_/g, ' ');
        var navText = 'Manage ' + entityNamePlural;

        var newLinkCode = `    <li><?= anchor('${manageModuleUrl}', '${navText}') ?></li>`;

        //figure out the path for the dynamic nav
        localFrameworkPath = localFrameworkPath.replace(/\//g, path.sep)

        if (path.sep == '/') {
            var filePath = path.sep + localFrameworkPath + path.sep + 'templates' + path.sep + 'views' + path.sep + 'partials' + path.sep + 'admin' + path.sep + 'dynamic_nav.php'
        } else {
            var filePath = localFrameworkPath + path.sep + 'templates' + path.sep + 'views' + path.sep + 'partials' + path.sep + 'admin' + path.sep + 'dynamic_nav.php'
        }

        var oldContent = await file_manager.readTheFile(filePath).catch((err) => {
            throw err
        })

        //make sure the content contains <ul> 
        var n = oldContent.includes("<ul>");

        if (n !== true) {
            oldContent = '<ul>\n';
        }

        var newContent = oldContent.replace('</ul>', '');
        newContent = newContent.concat(newLinkCode);
        newContent+= `\n</ul>`;        

        //update the dynamic nav
        await file_manager.upsertFile(filePath, newContent).catch((err) => {
            throw err
        })        

        return;
    },

    updateDynamicNavAlt: async (localFrameworkPath, navLabel, navUrl) => {

        var newLinkCode = `    <li><?= anchor('${navUrl}', '${navLabel}') ?></li>`;

        //figure out the path for the dynamic nav
        localFrameworkPath = localFrameworkPath.replace(/\//g, path.sep);

        if (path.sep == '/') {
            var filePath = path.sep + localFrameworkPath + path.sep + 'templates' + path.sep + 'views' + path.sep + 'partials' + path.sep + 'admin' + path.sep + 'dynamic_nav.php'
        } else {
            var filePath = localFrameworkPath + path.sep + 'templates' + path.sep + 'views' + path.sep + 'partials' + path.sep + 'admin' + path.sep + 'dynamic_nav.php'
        }

        var oldContent = await file_manager.readTheFile(filePath).catch((err) => {
            throw err
        })

        //make sure the content contains <ul> 
        var n = oldContent.includes("<ul>");

        if (n !== true) {
            oldContent = '<ul>\n';
        }

        var newContent = oldContent.replace('</ul>', '');
        newContent = newContent.concat(newLinkCode);
        newContent+= `\n</ul>`;        

        //update the dynamic nav
        await file_manager.upsertFile(filePath, newContent).catch((err) => {
            throw err
        })        

        return;
    },

    initMinSQL: async (localFrameworkPath, apiUrl) => {

        var dbConfigFilePath = localFrameworkPath + path.sep + 'config' + path.sep + 'database.php'

        //make sure we have a database.php file 
        var fileExists = await file_manager.doesThisExist(dbConfigFilePath).catch((err) => {
            throw err
        })

        if (fileExists !== true) {
            return;
        }

        var dbConfigContent = await file_manager.readTheFile(dbConfigFilePath).
        catch ((err) => {
            throw err
        })

        var dbSettings = await db_manager.extractDbSettings(dbConfigContent, true).
        catch ((err) => {
            throw err
        })

        var result = await db_manager.testDbSettings(dbSettings).catch((err) => {
            throw err
        })

        if (result !==  true) {
            return;
        }

        //fetch a list of tables on the database 
        var foundTables = await db_manager.fetchTables(dbSettings).catch((err) => {
            throw err
        })    

        var n = foundTables.includes("trongate_tokens");

        if (n == false) {
            //submitPostRequest(targetUrl, params, showFeedback)
            var targetUrl = apiUrl;
            var params = {
                code: 'FTCHADSQL'
            }
            var showFeedback = false;

            var responseObj = await request_manager.submitPostRequest(targetUrl, params, showFeedback)
            .catch((err) => {
                throw err
            })

            if (typeof responseObj !== 'object') {
                return;
            }

            var outbound_code = responseObj.outbound_code;

            if (outbound_code !== 'success') {
                return;
            } 

            var sql =  responseObj.additional_sql;

            //write the SQL to a temporary file 
            var tempFilePath = assetsDir + path.sep + 'additional_sql.sql';

            await file_manager.upsertFile(tempFilePath, sql).catch((err) => {
                throw err;
            })

            await db_manager.sqlImport(tempFilePath, dbSettings).catch((err) => {
                throw err;
            });

            await file_manager.ditchFile(tempFilePath).catch((err) => {
                throw err;
            });

            //finished importing SQL (if we required any)

        }

        return true;
    },

    downloadNewApp: async (args) => {

        var tempParams = JSON.parse(args.tempParams)
        var filePath = ''
        var downloadUrl = tempParams.download_location
        var destinationDir = assetsDir
        var downloadedFileName = tempParams.downloadedFileName
        var dbSettings = args.dbSettings
        var userSettings = tempParams.userSettings

        localFrameworkPath = args.localFrameworkPath
        var newAppPath = args.localFrameworkPath + path.sep + args.appDirName
        var dirExists = await file_manager.doesThisExist(newAppPath)
        .catch((err) => {
            throw (err)
        })

        if (dirExists == true) {
            throw 'Your app name of choice conflicts with an already existing directory'        
        } 

        await db_manager.testDbSettings(dbSettings, true).catch((err) => {
            throw 'error: unable to connect to database.  Please check your settings and try again.'
        })

        var downloadedZipFilePath = await file_manager.downloadThing(downloadUrl, destinationDir, downloadedFileName).catch((err) => {
            //throw 'error: unable to download Trongate framework - check your internet connection and try again'
            throw err
        })

        //extract the (zip) file
        var downloadedFrameworkLocation = await file_manager.extractThing(downloadedZipFilePath, destinationDir).catch((err) => {
            //throw 'error: unable to extract downloaded Trongate framework'
            throw err
        })

        //delete the zip file
        await file_manager.ditchFile(downloadedZipFilePath).catch((err) => {
            throw 'error: unable to delete downloaded framework zip file'
        })

        //rename the downloaded framework
        var downloadedDirName = downloadedFileName.replace('.zip', ''); //trongate-framework-master
        var downloadedDirFullPath = downloadedFrameworkLocation + path.sep + downloadedDirName
        var betterName = downloadedFrameworkLocation + path.sep + args.app_name  
        var oldPath = await file_manager.renameThing(downloadedDirFullPath, betterName).catch((err) => {
            //throw 'error: unable to rename downloaded framework zip file'
            throw err
        })

        //normalize paths
        var appPath = path.normalize(newAppPath)
        var downloadedDirPath = path.normalize(oldPath)

        //delete git ignore file
        var duffFile = downloadedDirPath + path.sep + '.gitignore'
        await file_manager.ditchFile(duffFile).catch((err) => {
            throw 'error: unable to delete gitignore file from downloaded framework'
        })

        //move the framework into position
        await file_manager.moveThing(downloadedDirPath, appPath).catch((err) => {
            throw 'error: unable to move downloaded framework into position'
        })

        var publicPath = appPath + path.sep + 'public'
        await file_manager.changePermission(publicPath, '0777').catch((err) => {
            throw 'error: unable to execute chmod command upon public folder'
        })

        //write the database file
        if (dbSettings !== '') {
            filePath = appPath + path.sep + 'config' + path.sep + 'database.php'
            await file_manager.upsertFile(filePath, '').catch((err) => {
                throw 'error: unable to clear the contents of the database.php config file'
            })

            var dbSettingsObj = JSON.parse(dbSettings);
            await setUpDatabaseConf(filePath, dbSettingsObj)
        }

        //setup the base_url
        var baseUrl = args.baseUrl
        if (baseUrl !== '') {
            filePath = appPath + path.sep + 'config' + path.sep + 'config.php'
            var configContents = await file_manager.readTheFile(filePath).catch((err) => {
                throw 'error: unable to clear the contents of the config.php file'
            })

            var ditchStr = `define('BASE_URL', '');`
            var replaceStr = `define('BASE_URL', '${baseUrl}');`
            var newConfigContent = configContents.replace(ditchStr, replaceStr)      
            await file_manager.upsertFile(filePath, newConfigContent).catch((err) => {
                throw 'error: unable to write contents to the config.php file'
            })

        }

        //set up the site owner
        filePath = appPath + path.sep + 'config' + path.sep + 'site_owner.php'
        var siteOwnerContents = await file_manager.readTheFile(filePath).catch((err) => {
            throw 'error: unable to read the contents of the site_owner.php file'
        })

        var ditchStr = `define('WEBSITE_NAME', '');`
        var replaceStr = `define('WEBSITE_NAME', '${args.app_name}');`
        var newSiteOwnerContent = siteOwnerContents.replace(ditchStr, replaceStr)

        await file_manager.upsertFile(filePath, newSiteOwnerContent).catch((err) => {
            throw 'error: unable to write contents to the site_owner.php file'
        })

        //all files cool - Let's create the db and we're done!
        await db_manager.createDb(args).catch((err) => {
            throw err
        })

        //attempt execute starter SQL if exists
        var starterSqlFilePath = appPath + path.sep + 'modules' + path.sep + 'welcome' + path.sep + 'setup.sql';
        await db_manager.sqlImport(starterSqlFilePath, JSON.parse(dbSettings)).catch((err) => {
            console.error('Error importing SQL file:', err);
        });

        //attempt delete starter SQL if exists
        await file_manager.ditchFile(starterSqlFilePath).catch((err) => {
            throw err;
        });
  
        //automatically set the permissions for the uploads folder on Trongate pages
        var  imgUploadsDir = appPath + path.sep + 'modules' + path.sep + 'trongate_pages' + path.sep + 'assets' + path.sep + 'images' + path.sep + 'uploads';
        await file_manager.chmodFolderRecursive(imgUploadsDir, '0777')
        .catch((err) => {
            throw err
        })

        //settingsFilePath  
        var codingPrefs = userSettings.codingPrefs
        var includeAdminLogin = codingPrefs.includeAdminLogin
        return
    },

    isValidTrongateApp: async (selectedDir, apiUrl) => {

        var requiredFolders = ['config', 'engine', 'modules']
        var folderPath = ''
        var folderExists = true
        var folders = []
        for (var i = 0; i < requiredFolders.length; i++) {
            folderPath = selectedDir + path.sep + requiredFolders[i]
            folders.push(folderPath)
        }

        await file_manager.checkFoldersExist(folders).catch((err) => {
            throw err
        })

        var output = await version_manager.initCheckForMismatch(selectedDir, apiUrl).catch((err) => {
            throw err
        })

        return output;
    }

}