const electron = require('electron')
const fse = require('fs-extra')
const path = require('path')
const os = require("os")
const { app, BrowserWindow, Tray, Menu, ipcMain, shell, dialog, nativeImage } = require('electron')
const configDir =  app.getPath('userData')
const assetsDir = configDir + path.sep + 'assets'
const db_manager = require("./db_manager.js")
const file_manager = require('./file_manager')
const framework_manager = require('./framework_manager')
const relations_manager = require('./relations_manager.js')

module.exports = {

    downloadedGenereatedModule: async (args) => {

        var tempParams =  JSON.parse(args.tempParams);

        //clarify the source, targetDir and targetFilename
        var downloadUrl = tempParams.downloadUrl
        // var moduleName = args.moduleName
        var downloadedFileName = downloadUrl.split("/").pop(-1)
        var localFrameworkPath = tempParams.localFrameworkPath;
        var moduleDir = tempParams.module_folder_name
        var newModulePath = localFrameworkPath + path.sep + 'modules' + path.sep + moduleDir
        var dbConfigPath = localFrameworkPath + path.sep + 'config' + path.sep + 'database.php'
        
        // ///////////////////////
        // // PRE FLIGHT CHECKS //
        // ///////////////////////

        //delete the assets folder
        var doesAssetsExist = await file_manager.doesThisExist(assetsDir).catch((err) => {
            throw 'error: unable to verify if assets dir exists'
        })

        if (doesAssetsExist == true) {
            await file_manager.deleteFolderRecursive(assetsDir).catch((err) => {
                throw 'could not delete assets dir'
            })
        }

        // make sure the target directory is available
        var dirExists = await file_manager.doesThisExist(newModulePath).catch((err) => {
            throw 'unuable to test if module directory already exists'
        })

        if (dirExists == true) {
            throw 'Your module name of choice conflicts with an already existing directory'
        }

        //read the database.php file
        var dbConfigContents = await file_manager.readTheFile(dbConfigPath).catch((err) => {
            throw 'unuable to read database.php config file'
        })

        //extract the database settings from the config file
        var dbSettings = await db_manager.extractDbSettings(dbConfigContents, true).catch((err) => {
            throw 'error: unable to connect to database.  Please check your settings and try again.'
        })

        //test the database connection
        await db_manager.testDbSettings(dbSettings, false).catch((err) => {
            throw 'error: unable to connect to database.  Please check your settings and try again.'
        }) 

        var tableExists = await db_manager.tableExists(moduleDir, dbSettings).catch((err) => {
            throw err;
        })

        if (tableExists == true) {
            throw `Your database already contains a ${moduleDir} table`;
        }

        // ////////////////////////////////
        // // PRE FLIGHT CHECKS FINISHED //
        // ////////////////////////////////

        //all clear - download the new module...
        var downloadedZipFilePath = await file_manager.downloadThing(downloadUrl, assetsDir, downloadedFileName).catch((err) => {
            throw 'error: unable to download Trongate framework - check your internet connection'
        })

        //extract the folder
        var destinationDir = downloadedZipFilePath.replace('.zip', '');
        await file_manager.extractThing(downloadedZipFilePath, destinationDir).catch((err) => {
            throw 'error: unable to extract module zip file'
        })

        //get the SQL content to be imported
        var sqlFilePath = destinationDir + path.sep + 'table_code.sql'
        await db_manager.sqlImport(sqlFilePath, dbSettings).catch((err) => {
            throw err
        })

        setTimeout(() => {
            framework_manager.initMinSQL(localFrameworkPath, args.apiUrl).catch((err) => {
                throw err
            })
        }, 2)

        var newDirPathName = assetsDir + path.sep + moduleDir
        await file_manager.moveThing(destinationDir, newDirPathName).catch((err) => {
            throw 'error: unable to move downloaded module dir'
        })

        //delete the zip file
        await file_manager.ditchFile(downloadedZipFilePath).catch((err) => {
            throw 'error: unable to delete downloaded module zip file'
        })

        //move the module into position
        await file_manager.moveThing(newDirPathName, newModulePath).catch((err) => {
            throw 'error: unable to move downloaded module into position'
        })

        await file_manager.changePermission(newModulePath, '0777').catch((err) => {
            throw 'error: unable to execute chmod command upon new module directory'
        })  

        var sqlFilePath = newModulePath + path.sep + 'table_code.sql'
        await file_manager.ditchFile(sqlFilePath).catch((err) => {
            throw 'error: unable to delete module sql file'
        })

        var appBaseUrl = await framework_manager.returnAppBaseUrl(localFrameworkPath).catch((err) => {
            throw err
        })

        var moduleManageUrl = appBaseUrl + moduleDir + '/manage'; //URL so,no need for path.sep here!

        //change permissions on module assets (for uploaders)
        var moduleAssetsPath = newModulePath + path.sep + 'assets'
        console.log('check1: changing permission (to 777) of ' + moduleAssetsPath)
        await file_manager.changePermission(moduleAssetsPath, '0777').catch((err) => {
            throw 'error: unable to execute chmod command upon new module directory'
        })

        if (tempParams.nav_label) {

            setTimeout(() => {
                //updateDynamicNav(args)
                var navLabel = tempParams.nav_label;
                var navUrl = moduleManageUrl.replace(appBaseUrl, '');
                framework_manager.updateDynamicNavAlt(localFrameworkPath, navLabel, navUrl)
                .catch((err) => {
                    throw err
                })

            }, 1)

        }


        var controllerFileName = moduleDir.charAt(0) .toUpperCase() + moduleDir.slice(1);
        var controllerFilePath = newModulePath + path.sep + 'controllers' + path.sep + controllerFileName + '.php'

        var output = {
          moduleManageUrl,
          localFrameworkPath,
          downloadUrl
        }

        return output;
    }

}