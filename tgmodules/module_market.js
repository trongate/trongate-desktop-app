const electron = require('electron')
const fse = require('fs-extra')
const path = require('path')
const os = require("os")
const openTheDevTools = false
const { app, BrowserWindow, Tray, Menu, ipcMain, shell, dialog, nativeImage } = require('electron')
const configDir =  app.getPath('userData')
const assetsDir = configDir + path.sep + 'assets'
const db_manager = require("./db_manager.js")
const file_manager = require('./file_manager')
const framework_manager = require('./framework_manager')
const request_manager = require("./request_manager.js")
var downloadInProgress = false

async function checkAndGetTargetModulePath(localFrameworkPath, targetModuleDirName) {
    //checks the framework that is about to get a new module and makes sure module does not already exist
    return new Promise((resolve, reject) => {

        //let's make sure the app does not already contain this module 
        var targetModulePath = localFrameworkPath +  path.sep + 'modules' + path.sep + targetModuleDirName;
        file_manager.isDir(targetModulePath)
        .then((folderExists) => {

            if (folderExists == true) {
                reject(`The app that you selected already has a ${targetModuleDirName} module.`);
            } else {
                resolve(targetModulePath);
            }

        })
        .catch((err) => {
            reject(err)
        })

    })

}


async function checkAndGetTargetThemePath(localFrameworkPath, targetThemeDirName) {
    //checks the framework that is about to get a new module and makes sure module does not already exist
    return new Promise((resolve, reject) => {

        //let's make sure the app does not already contain this theme 
        var targetModulePath = localFrameworkPath +  path.sep + 'public' + path.sep + 'themes' + path.sep + targetThemeDirName;
        file_manager.isDir(targetModulePath)
        .then((folderExists) => {

            if (folderExists == true) {
                reject(`The app that you selected already has that theme!`);
            } else {
                resolve(targetModulePath);
            }

        })
        .catch((err) => {
            reject(err)
        })

    })

}

async function clearAssetsDir() {
  return new Promise((resolve, reject) => {

    //delete the assets folder
    var doesAssetsExist = file_manager.doesThisExist(assetsDir)
    .then(() => {

        if (doesAssetsExist == true) {
            file_manager.deleteFolderRecursive(assetsDir).catch((err) => {
                reject(err);
            })
        } else {
            file_manager.makeADirectory(assetsDir).catch((err) => {
                reject(err);
            })
        }

        resolve(true)

    })
    .catch((err) => {
        reject(err);
    })

  })
}

function chooseDownloadLocation() {

    return new Promise((resolve, reject) => {
        dialog.showOpenDialog({
            buttonLabel: 'Select Directory',
            properties: ['openFile', 'openDirectory']
        }).then(openPath => {
            var selectedDir = openPath.filePaths[0];
            resolve(selectedDir);

        }).catch(err => {
            reject(err)
        })

    });
    
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}


































module.exports = {

    fetchFreeItemDownloadUrlEtc: async (args) => {
        //fetch the download information 
        var targetUrl = args.apiUrl;
        var tempParams = JSON.parse(args.tempParams);
        var params = {
            code: 'RTNFDNURL',
            userToken: tempParams.token,
            itemCode: tempParams.code
        }

        var showFeedback = true;
        var responseObj = await request_manager.submitPostRequest(targetUrl, params, showFeedback)
        .catch((err) => {
            throw err
        })

        return responseObj;
    },

    chooseDownloadLocation: async () => {
        var selectedDir = await chooseDownloadLocation();
        return selectedDir;
    },

    checkAndGetTargetModulePath: async (args) => {
      var localFrameworkPath = args.localFrameworkPath;
      var targetModuleDirName = args.targetModuleDirName;
      var targetModulePath = await checkAndGetTargetModulePath(localFrameworkPath, targetModuleDirName);
      return targetModulePath;
    },

    checkAndGetTargetThemePath: async (args) => {
      var localFrameworkPath = args.localFrameworkPath;
      var targetThemeDirName = args.targetModuleDirName;
      var targetThemePath = await checkAndGetTargetThemePath(localFrameworkPath, targetThemeDirName);
      return targetThemePath;
    },

    downloadFreeItem: async (args) => {

        //fetch the download information 
        var responseObj = args.responseObj;

        var downloadUrl = responseObj.file_path;
        var downloadedFileName = responseObj.file_name;
        var targetDir = args.selectedDir;

        // //download the item
        var downloadedZipFilePath = await file_manager.downloadThing(downloadUrl, targetDir, downloadedFileName);

        //extract zip file
        var unzippedLocation = await file_manager.extractThing(downloadedZipFilePath, targetDir)
        .catch((err) => {
            throw err
        })

        //delete the zip file
        await file_manager.ditchFile(downloadedZipFilePath)
        .catch((err) => {
            throw err
        })   

        //permissions 
        var newDirName = downloadedFileName.replace('.zip', '');
        var newItemPath = targetDir + path.sep + newDirName

        await file_manager.chmodFolderRecursive(newItemPath, '0777')
        .catch((err) => {
            throw err
        })    

        return;        
    },

    downloadFreeModule: async (args) => {

        var downloadObj = JSON.parse(args.downloadInfo)
        var downloadUrl = downloadObj.file_path;
        var downloadedFileName = downloadObj.file_name;
        var targetDir = assetsDir;

        var downloadedZipFilePath = await file_manager.downloadThing(downloadUrl, targetDir, downloadedFileName).catch((err) => {
            throw err
        })

        //extract zip file
        var unzippedLocation = await file_manager.extractThing(downloadedZipFilePath, assetsDir)
        .catch((err) => {
            throw err
        })

        //delete the zip file
        await file_manager.ditchFile(downloadedZipFilePath)
        .catch((err) => {
            throw err
        })

        //move the module into position
        var modulesDir = args.localFrameworkPath + path.sep + 'modules'
        await file_manager.moveThing(unzippedLocation, modulesDir)
        .catch((err) => {
            throw err
        })

        //permissions 
        var newModulePath = args.targetModulePath;

        await file_manager.chmodFolderRecursive(newModulePath, '0777')
        .catch((err) => {
            throw err
        })

        //clear (empty) the assetsDir 
        await clearAssetsDir();

        //post install stuff (e.g., check for an SQL file)
        var dirFiles = await file_manager.listTheDir(newModulePath)
        .catch((err) => {
            throw err
        })

        var appUrl = await framework_manager.returnAppBaseUrl(args.localFrameworkPath)
        .catch((err) => {
            throw err
        })

        var gotSqlFile = false
        for (var i = dirFiles.length - 1; i >= 0; i--) {
            var fileName = dirFiles[i];
            var lastFour = fileName.substr(fileName.length - 4);

            if (lastFour == '.sql') {
                gotSqlFile = true;
            }
        }

        var moduleDir = args.targetModuleDirName //e.g., bookings 

        // IF we have an SQL file, make sure min SQL installed on the framework  
        if (gotSqlFile == true) {
            await framework_manager.initMinSQL(args.localFrameworkPath, args.apiUrl)
            .catch((err) => {
                throw err
            })

        }

        var moduleUrl = appUrl + moduleDir;

        // check to see if this is a standard Trongate 'admin' module - so that nav can be added
        var isStandardAdminModule = await framework_manager.isStandardAdminModule(newModulePath)
        .catch((err) => {
            throw err
        })

        if (isStandardAdminModule == true) {
            //let's attempt to update the dynamic nav file 
            var manageModuleUrl = moduleUrl+= '/manage';

            if (gotSqlFile !== true) {
                moduleUrl = manageModuleUrl;
            }

            manageModuleUrl = manageModuleUrl.replace(appUrl, '');
            await framework_manager.updateDynamicNav(args.localFrameworkPath, moduleDir, manageModuleUrl)
            .catch((err) => {
                throw err
            })
  
        }

        // register the download!!!!! 
        args.code = 'REGAPPFREEDNLD'
       
        var targetUrl = args.apiUrl; 
        await request_manager.submitPostRequest(targetUrl, args, false)
        .catch((err) => {
            throw err
        })

        //return output to main.js so that the 'finished' page can display  
        var output = {
          moduleUrl,
          gotSqlFile,
          appUrl
        }

        return output;
    },

    downloadFreeTheme: async (args) => {

        var themeName = args.targetModuleDirName
        var downloadObj = JSON.parse(args.downloadInfo)
        var downloadUrl = downloadObj.file_path;
        var downloadedFileName = downloadObj.file_name;
        var targetDir = assetsDir;

        var downloadedZipFilePath = await file_manager.downloadThing(downloadUrl, targetDir, downloadedFileName).catch((err) => {
            throw err
        })

        //extract zip file
        var unzippedLocation = await file_manager.extractThing(downloadedZipFilePath, assetsDir)
        .catch((err) => {
            throw err
        })

        //delete the zip file
        await file_manager.ditchFile(downloadedZipFilePath)
        .catch((err) => {
            throw err
        })

        //move the theme into position
        var themesDir = args.localFrameworkPath + path.sep + 'public' + path.sep + 'themes'
        await file_manager.moveThing(unzippedLocation, themesDir)
        .catch((err) => {
            throw err
        })

        //permissions 
        var newThemePath = themesDir + path.sep + themeName;

        await file_manager.chmodFolderRecursive(newThemePath, '0777')
        .catch((err) => {
            throw err
        })

        //clear (empty) the assetsDir 
        await clearAssetsDir();

        //get a list of all of the directories inside the themes folder
        var subDirs =  await file_manager.listSubDirs(newThemePath)
        .catch((err) => {
            throw err
        })

        if (subDirs.length>0) {
            var configDir = args.targetModuleDirName + '/' + subDirs[0]
        } else {
            var configDir = args.targetModuleDirName
        }

        var themesConfig = args.localFrameworkPath + path.sep + 'config' +  path.sep + 'themes.php'
        var themesConfigContent = await file_manager.readTheFile(themesConfig)
            .catch((err) => {
                throw err
            })

    //build sample theme config text...
    var ditchText = `define('THEMES', $themes);`
    var replaceText = `
$${themeName}_theme = [
    "dir" => "${configDir}",
    "template" => "${themeName}.php",
];

$themes['${themeName}'] = $${themeName}_theme;
define('THEMES', $themes);
`;

    var newConfigText = themesConfigContent.replace(ditchText, replaceText)
    await file_manager.upsertFile(themesConfig, newConfigText)
        .catch((err) => {
            throw err
        })

        //open up Templates.php
        var templatesController = args.localFrameworkPath + path.sep + 'templates' +  path.sep + 'controllers' + path.sep + 'Templates.php'
        var templatesControllerContent = await file_manager.readTheFile(templatesController)
            .catch((err) => {
                throw err
            })


        ditchText = `class Templates extends Trongate {`;
        replaceText = `class Templates extends Trongate {

    function ${themeName}($data) {
        load('${themeName}', $data);
    }`

        var newControllerText = templatesControllerContent.replace(ditchText, replaceText)
        await file_manager.upsertFile(templatesController, newControllerText)
        .catch((err) => {
            throw err
        })

        //register the download!!!!! 
        args.code = 'REGAPPFREEDNLD'

        var downloadInfoStr = args.downloadInfo
        var downloadInfoObj = JSON.parse(downloadInfoStr)
        args.itemCode = downloadInfoObj.item_code
       
        var targetUrl = args.apiUrl; 
        await request_manager.submitPostRequest(targetUrl, args, false)
        .catch((err) => {
            throw err
        })

        return true;
    }

}