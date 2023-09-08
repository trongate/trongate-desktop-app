const path = require('path')
const db_manager = require("./db_manager.js")
const file_manager = require('./file_manager')
const framework_manager = require('./framework_manager')
const request_manager = require('./request_manager')

module.exports = {

    generateMultiUploader: async (args) => {

        var tempParamsStr = args.tempParams;
        var tempParams =  JSON.parse(tempParamsStr);

        //get the target localFrameworkPath 
        var localFrameworkPath = tempParams.localFrameworkPath;
        var targetModule = tempParams.selectedModule;

        //update the module/views/show.php file
        var showFilePath = localFrameworkPath + path.sep + 'modules' + path.sep + targetModule + path.sep + 'views' + path.sep + 'show.php'

        var oldFileContent = await file_manager.readTheFile(showFilePath) .
        catch ((err) => {
            throw err;
        })

        var code = 'IMAGE_UPLOADER_MULTI_PLEASE_REWRITE';
        var fileType = 'show';

        var params = {
            action: 'generateMultiUploader',
            code,
            oldFileContent,
            fileType,
            localFrameworkPath,
            targetModule
        }

        var targetUrl =  args.apiUrl;
        var newShowFileContent = await request_manager.submitPostRequest(targetUrl, params, false)
        .catch((err) => {
            throw err;
        })

        if (newShowFileContent == 'exists') {
            throw 'Multi-picture uploader already exists for target module'
        }

        //update the show file content.
        await file_manager.upsertFile(showFilePath, newShowFileContent).
        catch ((err) => {
            throw err;
        })

        //update the controller file (by adding the settings)
        var controllerFileName = targetModule.charAt(0) .toUpperCase() + targetModule.slice(1);
        var controllerFilePath = localFrameworkPath + path.sep + 'modules' + path.sep + targetModule + path.sep + 'controllers' + path.sep + controllerFileName + '.php'
        params.oldFileContent = await file_manager.readTheFile(controllerFilePath)
        .catch ((err) => {
            throw err;
        })

        params.code = 'IMAGE_UPLOADER_MULTI_PLEASE_REWRITE';
        params.fileType = 'controller';

        var newControllerContent = await request_manager.submitPostRequest(targetUrl, params, false)
        .catch ((err) => {
            throw err;
        })

        if (newControllerContent == 'exists') {
            throw 'Controller file indicates multi-uploader already exists'
        }

        await file_manager.upsertFile(controllerFilePath, newControllerContent)
        .catch ((err) => {
            throw err;
        })

        var baseUrl = await framework_manager.returnAppBaseUrl(localFrameworkPath)
        .catch ((err) => {
            throw err;
        })

        var moduleManageUrl = baseUrl + targetModule + '/manage';
        return moduleManageUrl;

    },

    generateImageUploader: async (args) => {
        //single picture uploader!
        var tempParamsStr = args.tempParams;
        var tempParams =  JSON.parse(tempParamsStr);

        //get the target localFrameworkPath 
        var localFrameworkPath = tempParams.localFrameworkPath;
        var targetModule = tempParams.selectedModule;

        //update the controller file (by adding the settings)
        var controllerFileName = targetModule.charAt(0) .toUpperCase() + targetModule.slice(1);
        var controllerFilePath = localFrameworkPath + path.sep + 'modules' + path.sep + targetModule + path.sep + 'controllers' + path.sep + controllerFileName + '.php'
        var oldFileContent = await file_manager.readTheFile(controllerFilePath).
        catch ((err) => {
            throw err;
        })

        var code = 'IMAGE_UPLOADER_PLEASE_REWRITE';
        var fileType = 'controller';

        var params = {
            action: 'generateImageUploader',
            code,
            oldFileContent,
            fileType,
            localFrameworkPath,
            targetModule
        }

        var targetUrl =  args.apiUrl;
        var newControllerContent = await request_manager.submitPostRequest(targetUrl, params, false)
        .catch((err) => {
            throw err;
        })

        if (newControllerContent == 'exists') {
            throw 'You appear to already have a uploader in that module';
        }

        //update controller file
        await file_manager.upsertFile(controllerFilePath, newControllerContent).
        catch ((err) => {
            throw err;
        })

        //update the view/show.php file  
        var showFilePath = localFrameworkPath + path.sep + 'modules' + path.sep + targetModule + path.sep + 'views' + path.sep + 'show.php'

        params.oldFileContent = await file_manager.readTheFile(showFilePath).
        catch ((err) => {
            throw err;
        })

        params.code = 'IMAGE_UPLOADER_PLEASE_REWRITE'
        params.fileType = 'show'

        var newShowFileContent = await request_manager.submitPostRequest(targetUrl, params, false)
        .catch ((err) => {
            throw err;
        })

        await file_manager.upsertFile(showFilePath, newShowFileContent)
        .catch ((err) => {
            throw err;
        })

        //get the dbCredentials
        var dbConfigPath = localFrameworkPath + path.sep + 'config' + path.sep + 'database.php'

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

        var sql = 'describe ' + targetModule;
        var query = `describe ${targetModule}`
        var results = await db_manager.executeQuery(query, dbSettings).catch((err) => {
            throw err;
        })

        var targetColumnName = 'picture';
        var columnAlreadyExists = false;
        var lastColumnName = '';

        for (var i = 0; i < results.length; i++) {
            if (results[i] .Field == targetColumnName) {
                columnAlreadyExists = true;
            }

            lastColumnName = results[i] .Field;
        }

        if (columnAlreadyExists == false) {
            sql = 'ALTER TABLE `' + targetModule + '` ADD `' + targetColumnName + '` VARCHAR(255) DEFAULT \'\' AFTER `' + lastColumnName + '`';
            await db_manager.executeQuery(sql, dbSettings) .
                catch ((err) => {
                    throw err;
                })
        }

        var baseUrl = await framework_manager.returnAppBaseUrl(localFrameworkPath)
        .catch ((err) => {
            throw err;
        })

        var moduleManageUrl = baseUrl + targetModule + '/manage';
        return moduleManageUrl;
    }    

}