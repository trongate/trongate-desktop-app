const path = require('path')
const { app, BrowserWindow, Tray, Menu, ipcMain, shell, dialog, nativeImage } = require('electron')
const db_manager = require("./db_manager.js")
const file_manager = require("./file_manager.js")
const request_manager = require("./request_manager.js")
const configDir =  app.getPath('userData')
const assetsDir = configDir + path.sep + 'assets'
const largeModuleName = 19

function getExcludeList() {
    //modules for which we cannot have a relationship
    var excludeList = ["module_relations", "welcome"]
    return excludeList
}

function getSelectableModules(dirItems, excludeList) {

    return new Promise((resolve, reject) => {

        var selectableModules = []
        var targetStr = 'trongate_';

        for (var i = 0; i < dirItems.length; i++) {
            var dirItem = dirItems[i]
            var n = excludeList.includes(dirItem)

            //exclude items with dots, spaces and also assoc modules
            if ((dirItem.indexOf('.') > -1) || (dirItem.indexOf(' ') > -1) || (dirItem.indexOf('associated_') > -1)) {
                n = true
            }

            var strStart = dirItem.substring(0,9);

            if ((strStart !== targetStr) && (n !== true)) {
                selectableModules.push(dirItem);
            }

        }

        resolve(selectableModules); 

    })   
}

function getRelationsFileSettingsPath(localFrameworkPath, firstModule, secondModule) {
    var targetDir = 'modules' + path.sep + 'module_relations' + path.sep + 'assets' + path.sep + 'module_relations'
    var fileName = firstModule + '_and_' + secondModule + '.json'
    var settingsPath = localFrameworkPath + path.sep + targetDir + path.sep + fileName
    return settingsPath
}

function initExtractSingularAndPlural(firstModule_content, secondModule_content) {

    return new Promise((resolve, reject) => {

        var data = []
        var firstModuleInfo = extractModuleSingularAndPlural(firstModule_content)
        var secondModuleInfo = extractModuleSingularAndPlural(secondModule_content)

        data.push(firstModuleInfo)
        data.push(secondModuleInfo)

        resolve(data)

    })
    
}

function extractModuleSingularAndPlural(fileContent) {

    var test_str = fileContent
    var start_pos = test_str.indexOf('View All ') + 9
    var end_pos = test_str.indexOf(',',start_pos)
    var plural = test_str.substring(start_pos,end_pos)
    var ditch1 = `'`;
    var ditch2 = `"`;
    plural =  plural.replace(ditch1, '');
    plural =  plural.replace(ditch2, '');

    var startPos2 = test_str.indexOf('You are about to delete a');
    var endPos2 = test_str.indexOf(' record.');
    var singular = test_str.substring(startPos2,endPos2);
    var ditch = 'You are about to delete ';
    singular = singular.replace(ditch, '');

    var firstTwo = singular.substring(0, 2);

    if (firstTwo == 'a ') {
        singular = singular.replace(firstTwo, '');
    } else {
        singular = singular.replace('an ', '');
    }

    singular = singular.toLowerCase();
    plural = plural.toLowerCase();

    var result = {
        singular,
        plural
    }

    return result

}

function getRelationsFileSettingsPath(localFrameworkPath, firstModule, secondModule) {
    var targetDir = 'modules' + path.sep + 'module_relations' + path.sep + 'assets' + path.sep + 'module_relations'
    var fileName = firstModule + '_and_' + secondModule + '.json'
    var settingsPath = localFrameworkPath + path.sep + targetDir + path.sep + fileName
    return settingsPath
}













































module.exports = {

    initSubmitRelationType: async (args) => {
        var localFrameworkPath = args.localFrameworkPath;

        // var allLocalStorage = args.allLocalStorage

        // var relationshipType = allLocalStorage.relationshipType
        var excludeList = getExcludeList()

        //get list of modules then ask user to choose one
        var dirPath = localFrameworkPath + path.sep + 'modules' + path.sep

        var dirItems = await file_manager.listTheDir(dirPath).catch((err) => {
            throw err
        })

        var selectableModules = await getSelectableModules(dirItems, excludeList);

        if (selectableModules.length < 2) {
            throw 'You do not have enough modules to create a module relation'
        }

        return selectableModules;
    },

    requestSelectableColumns: async (args, targetModule) => {
        var localFrameworkPath = args.localFrameworkPath;
        var tempParams = JSON.parse(args.tempParams);

        if (targetModule == 'firstModule') {
            var targetModule = tempParams.firstModule;
        } else {
            var targetModule = tempParams.secondModule;
        }

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

        var query = `describe ${targetModule}`
        var results = await db_manager.executeQuery(query, dbSettings).catch((err) => {
            throw err;
        })

        var columns = []
        for (var i = 0; i < results.length; i++) {
            columns.push(results[i].Field)
        } 

        return columns;
    },

    makeSureRelationAllowed: async (args) => {
        var localFrameworkPath = args.localFrameworkPath;
        var tempParamsStr = args.tempParams;
        var tempParams =  JSON.parse(tempParamsStr);
        args.tempParams =  tempParams;
        var firstModuleName = tempParams.firstModule;
        var secondModuleName = tempParams.secondModule;

        var settingsPath = getRelationsFileSettingsPath(localFrameworkPath, firstModuleName, secondModuleName)
        var settingsPathAlt = getRelationsFileSettingsPath(localFrameworkPath, secondModuleName, firstModuleName)

        var relationExists = await file_manager.doesThisExist(settingsPath).catch((err) => {
            throw err
        })

        var relationExistsAlt = await file_manager.doesThisExist(settingsPathAlt).catch((err) => {
            throw err
        })

        if ((relationExists == false) && (relationExistsAlt == false)) {
            return args;
        } else {
            throw 'The modules that you selected already have a relationship!'
        }

    },

    makeSureGotModuleRelations: async (args) => {
        //make sure we have a module_relations module
        var tempParams = args.tempParams;
        var localFrameworkPath = args.localFrameworkPath
        var assocModuleDirName = 'module_relations'
        var targetAssocPath = localFrameworkPath + path.sep + 'modules' + path.sep + 'module_relations'
        var assocModuleExists = await file_manager.doesThisExist(targetAssocPath).catch((err) => {
            throw err;
        })

        if (assocModuleExists == false) {

            //LET'S GET THE ASSOCIATION MODULE FROM GITHUB!
            //clear the assets dir
            await file_manager.deleteFolderRecursive(assetsDir).catch((err) => {
                throw err;
            })

            var params = {
                code: 'MRL_GET_MODULE_URL'
            }

            var targetUrl = args.apiUrl;

            //request URL for module_relations module
            var downloadInfo = await request_manager.submitPostRequest(targetUrl, params, false).catch((err) => {
                throw err
            })

            var downloadUrl = downloadInfo.relations_zip_url;
            
            //clarify the source, targetDir and targetFilename
            var destinationDir = assetsDir
            var downloadedFileName = downloadInfo.downloaded_file_name;

            var tempModulePath = await file_manager.downloadThing(downloadUrl, destinationDir, downloadedFileName).catch((err) => {
                throw err;
            })

            var assocModuleDirName = 'module_relations'
            var extractLocation = assetsDir
            var tempModuleDir = await file_manager.extractThing(tempModulePath, extractLocation).catch((err) => {
                throw err;
            })

            var dirItems = await file_manager.listTheDir(assetsDir).catch((err) => {
                throw err;
            })

            var extractedDir = ''
            for (var i = 0; i < dirItems.length; i++) {
                var x = dirItems[i].includes(assocModuleDirName);
                var y = dirItems[i].includes('.zip');
                if ((x == true) && (y == false)) {
                    extractedDir = dirItems[i]
                }
            }

            var oldDirName = assetsDir + path.sep + extractedDir
            var newDirName = assetsDir + path.sep + 'module_relations'
            await file_manager.renameThing(oldDirName, newDirName).catch((err) => {
                throw err;
            })

            var newPath = localFrameworkPath + path.sep + 'modules' + path.sep + assocModuleDirName

            await file_manager.moveThing(newDirName, newPath).catch((err) => {
                throw err;
            })

            await file_manager.chmodFolderRecursive(newPath, '0777').catch((err) => {
                throw err;
            })  

            //delete the entire assets dir (including zip file)
            await file_manager.deleteFolderRecursive(assetsDir).catch((err) => {
                throw err;
            })

        }

        return args;
    },

    generateOneToOneWithBridgingTbl: async (args) => {

        //STEP 1: clarify important data 
        var tempParams = args.tempParams;
        var localFrameworkPath = args.localFrameworkPath
        var firstModuleName = tempParams.firstModule;
        var secondModuleName = tempParams.secondModule;
        var firstModuleIdentifierColumn = tempParams.firstModuleIdentifierColumn
        var secondModuleIdentifierColumn = tempParams.secondModuleIdentifierColumn

        var showFilePathFirstModule = localFrameworkPath + path.sep + 'modules' + path.sep + firstModuleName + path.sep + 'views' + path.sep + 'show.php'
        var showFilePathSecondModule = localFrameworkPath + path.sep + 'modules' + path.sep + secondModuleName + path.sep + 'views' + path.sep + 'show.php'
        var relationshipType = tempParams.submittedRelationType;
        var assocModuleDirName = 'module_relations'

        //get the 'show' file content for both modules
        args.localFrameworkPath = localFrameworkPath
        args.showFileContentsFirstModule = await file_manager.readTheFile(showFilePathFirstModule)
        .catch((err) => {
            throw err
        })

        args.showFileContentsSecondModule = await file_manager.readTheFile(showFilePathSecondModule)
        .catch((err) => {
            throw err
        })

        //let's clarify some 'args' data
        var entityData = await initExtractSingularAndPlural(args.showFileContentsFirstModule, args.showFileContentsSecondModule)
        
        args.firstModuleSingular = entityData[0]['singular']
        args.firstModulePlural = entityData[0]['plural']
        args.secondModuleSingular = entityData[1]['singular']
        args.secondModulePlural = entityData[1]['plural']
        args.relationshipType = relationshipType
        args.firstModuleName = firstModuleName
        args.secondModuleName = secondModuleName
        args.firstModuleIdentifierColumn = firstModuleIdentifierColumn
        args.secondModuleIdentifierColumn = secondModuleIdentifierColumn  

        args.settingsPath = getRelationsFileSettingsPath(localFrameworkPath, firstModuleName, secondModuleName)
        
        //STEP 3:  Create The settings file for inside the module relations module.
        await file_manager.createRelationSettingsFile(args)
        .catch((err) => {
            throw err;
        })

        //STEP 4:  Update the 'show' file for the first module
        args.relationshipType = 'one to one'
        args.bridgingTblRequired = 'true'
        args.oldContent = args.showFileContentsFirstModule
        args.firstModule = args.firstModuleName
        args.secondModule = args.secondModuleName
        args.targetModule = 'firstModule'

        var params = {
            code: 'MRL_PLEASE_REWRITE',
            relationshipType,
            typeOfFile: 'show',
            firstModule: args.firstModuleName,
            secondModule: args.secondModuleName,
            firstModuleIdentifierColumn,
            secondModuleIdentifierColumn,
            targetModule: 'firstModule',
            oldContent: args.oldContent,
            bridgingTblRequired: 'true'
        }

        var newShowFileContent = await request_manager.submitPostRequest(args.apiUrl, params, false).catch((err) => {
            throw err;
        })

        await file_manager.upsertFile(showFilePathFirstModule, newShowFileContent).catch((err) => {
            throw err;
        })

        //STEP 5:  Update the 'show' file for the second module
        params.oldContent = args.showFileContentsSecondModule;
        params.targetModule = 'secondModule'

        var newShowFileContentTwo = await request_manager.submitPostRequest(args.apiUrl, params, false).catch((err) => {
            throw err;
        })

        await file_manager.upsertFile(showFilePathSecondModule, newShowFileContentTwo).catch((err) => {
            throw err;
        })

        return args;
    },

    generateOneToOneWithoutBridgingTbl: async (args) => {

        var tempParams = args.tempParams;
        var localFrameworkPath = args.localFrameworkPath
        var firstModuleName = tempParams.firstModule;
        var secondModuleName = tempParams.secondModule;
        var firstModuleIdentifierColumn = tempParams.firstModuleIdentifierColumn
        var secondModuleIdentifierColumn = tempParams.secondModuleIdentifierColumn

        var showFilePathFirstModule = localFrameworkPath + path.sep + 'modules' + path.sep + firstModuleName + path.sep + 'views' + path.sep + 'show.php'
        var showFilePathSecondModule = localFrameworkPath + path.sep + 'modules' + path.sep + secondModuleName + path.sep + 'views' + path.sep + 'show.php'
        var relationshipType = tempParams.submittedRelationType;
        var assocModuleDirName = 'module_relations'

        //STEP 2:  Make sure we have a module_relations module.

        //STEP 2a:  but before we can do that, we need to get the 'show' file content for both modules
        args.localFrameworkPath = localFrameworkPath
        args.showFileContentsFirstModule = await file_manager.readTheFile(showFilePathFirstModule)
        .catch((err) => {
            throw err
        })

        args.showFileContentsSecondModule = await file_manager.readTheFile(showFilePathSecondModule)
        .catch((err) => {
            throw err
        })

        //let's clarify some 'args' data
        var entityData = await initExtractSingularAndPlural(args.showFileContentsFirstModule, args.showFileContentsSecondModule)
        
        args.firstModuleSingular = entityData[0]['singular']
        args.firstModulePlural = entityData[0]['plural']
        args.secondModuleSingular = entityData[1]['singular']
        args.secondModulePlural = entityData[1]['plural']
        args.relationshipType = relationshipType
        args.firstModuleName = firstModuleName
        args.secondModuleName = secondModuleName
        args.firstModuleIdentifierColumn = firstModuleIdentifierColumn
        args.secondModuleIdentifierColumn = secondModuleIdentifierColumn  

        args.settingsPath = getRelationsFileSettingsPath(localFrameworkPath, firstModuleName, secondModuleName)
        
        //STEP 3:  Create The settings file for inside the module relations module.
        await file_manager.createRelationSettingsFile(args)
        .catch((err) => {
            throw err;
        })

        //STEP 4:  Update controller file for first module
        var moduleName = firstModuleName;
        var altModule  = secondModuleName;
        var controllerFileName = moduleName.charAt(0).toUpperCase() + moduleName.slice(1)
        var controllerPath = localFrameworkPath + path.sep + 'modules' + path.sep + moduleName + path.sep + 'controllers' + path.sep + controllerFileName + '.php'

        //get the content for the  controller...
        var oldControllerContent = await file_manager.readTheFile(controllerPath).catch((err) => {
            throw err;
        })

        //getting controller code from api 
        var params = {}
        params.typeOfFile = 'controller'
        params.oldContent = oldControllerContent
        params.altModuleForeignKey = moduleName + '_id'
        params.altModule = altModule 
        params.altModuleIdentifierColumn_name = args.secondModuleIdentifierColumn
        params.callingModuleForeignKey = altModule + '_id'
        params.callingModule = moduleName
        params.callingModuleIdentifierColumn = args.firstModuleIdentifierColumn
        params.callingModuleName = moduleName
        params.code = 'MRL_PLEASE_REWRITE'
        params.relationshipType = 'one to one',
        params.bridgingTblRequired = 'false',
        params.relationshipType = relationshipType
        
        var newFileContent = await request_manager.submitPostRequest(args.apiUrl, params, false).catch((err) => {
            throw err;
        })

        await file_manager.upsertFile(controllerPath, newFileContent).catch((err) => {
            throw err;
        })

        //STEP 5:  Update create file for first module
        var createFileName = 'create'
        var createPath = localFrameworkPath + path.sep + 'modules' + path.sep + moduleName + path.sep + 'views' + path.sep + createFileName + '.php'

        //get the new file content from the API
        var oldCreateContent = await file_manager.readTheFile(createPath).catch((err) => {
            throw err;
        })

        //get new create file code for the first module 
        params.typeOfFile = 'create'
        params.oldContent = oldCreateContent

        var newCreateContent = await request_manager.submitPostRequest(args.apiUrl, params, false).catch((err) => {
            throw err;
        })

        await file_manager.upsertFile(createPath, newCreateContent).catch((err) => {
            throw err;
        })

        //STEP 6:  Update controller file for second module
        moduleName = secondModuleName;
        altModule  = firstModuleName;
        controllerFileName = moduleName.charAt(0).toUpperCase() + moduleName.slice(1)
        controllerPath = localFrameworkPath + path.sep + 'modules' + path.sep + moduleName + path.sep + 'controllers' + path.sep + controllerFileName + '.php'

        //get the content for the  controller...
        oldControllerContent = await file_manager.readTheFile(controllerPath).catch((err) => {
            throw err;
        })

        //getting controller code from api 
        params.typeOfFile = 'controller'
        params.oldContent = oldControllerContent
        params.altModuleForeignKey = moduleName + '_id'
        params.altModule = altModule 
        params.altModuleIdentifierColumn_name = args.secondModuleIdentifierColumn
        params.callingModuleForeignKey = altModule + '_id'
        params.callingModule = moduleName
        params.callingModuleIdentifierColumn = args.firstModuleIdentifierColumn
        params.callingModuleName = moduleName

        newFileContent = await request_manager.submitPostRequest(args.apiUrl, params, false).catch((err) => {
            throw err;
        })

        await file_manager.upsertFile(controllerPath, newFileContent).catch((err) => {
            throw err;
        })

        //STEP 5:  Update create file for first module
        createPath = localFrameworkPath + path.sep + 'modules' + path.sep + moduleName + path.sep + 'views' + path.sep + createFileName + '.php'

        //get the new file content from the API
        oldCreateContent = await file_manager.readTheFile(createPath).catch((err) => {
            throw err;
        })

        //get new create file code for the first module 
        params.typeOfFile = 'create'
        params.oldContent = oldCreateContent

        newCreateContent = await request_manager.submitPostRequest(args.apiUrl, params, false).catch((err) => {
            throw err;
        })

        await file_manager.upsertFile(createPath, newCreateContent).catch((err) => {
            throw err;
        })

        //STEP 6: Add additional column onto first module table

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

        var targetTable = firstModuleName;
        var targetColumn = secondModuleName + '_id'
     
        //make sure the child module has a foreign key
        await db_manager.makeSureGotColumn(targetTable, targetColumn, dbSettings).catch((err) => {
            throw err;
        })


        //STEP 7: Add additional column onto second module table
        targetTable = secondModuleName;
        targetColumn = firstModuleName + '_id'
     
        //make sure the child module has a foreign key
        await db_manager.makeSureGotColumn(targetTable, targetColumn, dbSettings).catch((err) => {
            throw err;
        })

        return args;
    },

    generateOneToMany: async (args) => {

        //STEP 1: clarify important data 
        var tempParams = args.tempParams;
        var localFrameworkPath = args.localFrameworkPath
        var firstModuleName = tempParams.firstModule;
        var secondModuleName = tempParams.secondModule;
        var firstModuleIdentifierColumn = tempParams.firstModuleIdentifierColumn
        var secondModuleIdentifierColumn = tempParams.secondModuleIdentifierColumn

        var showFilePathFirstModule = localFrameworkPath + path.sep + 'modules' + path.sep + firstModuleName + path.sep + 'views' + path.sep + 'show.php'
        var showFilePathSecondModule = localFrameworkPath + path.sep + 'modules' + path.sep + secondModuleName + path.sep + 'views' + path.sep + 'show.php'
        var relationshipType = tempParams.submittedRelationType;
        var assocModuleDirName = 'module_relations'

        //but before we can do that, we need to get the 'show' file content for both modules
        args.localFrameworkPath = localFrameworkPath
        args.showFileContentsFirstModule = await file_manager.readTheFile(showFilePathFirstModule)
        .catch((err) => {
            throw err
        })

        args.showFileContentsSecondModule = await file_manager.readTheFile(showFilePathSecondModule)
        .catch((err) => {
            throw err
        })

        //let's clarify some 'args' data
        var entityData = await initExtractSingularAndPlural(args.showFileContentsFirstModule, args.showFileContentsSecondModule)
        
        args.firstModuleSingular = entityData[0]['singular']
        args.firstModulePlural = entityData[0]['plural']
        args.secondModuleSingular = entityData[1]['singular']
        args.secondModulePlural = entityData[1]['plural']
        args.relationshipType = relationshipType
        args.firstModuleName = firstModuleName
        args.secondModuleName = secondModuleName
        args.firstModuleIdentifierColumn = firstModuleIdentifierColumn
        args.secondModuleIdentifierColumn = secondModuleIdentifierColumn  

        args.settingsPath = getRelationsFileSettingsPath(localFrameworkPath, firstModuleName, secondModuleName)
        
        //STEP 2:  Create The settings file for inside the module relations module.
        await file_manager.createRelationSettingsFile(args)
        .catch((err) => {
            throw err;
        })

        //STEP 3: Update the 'show' file for the first module 
        var params = {
            code: 'MRL_PLEASE_REWRITE',
            relationshipType,
            typeOfFile: 'show',
            firstModule: args.firstModuleName,
            secondModule: args.secondModuleName,
            firstModuleIdentifierColumn,
            secondModuleIdentifierColumn,
            targetModule: 'firstModule',
            bridgingTblRequired: 'false'
        }

        var moduleName = firstModuleName;
        var altModule = secondModuleName;

        params.oldContent = args.showFileContentsFirstModule
        params.altModuleForeignKey = moduleName + '_id'
        params.altModule = altModule 
        params.altModuleIdentifierColumn_name = args.secondModuleIdentifierColumn
        params.callingModuleForeignKey = altModule + '_id'
        params.callingModule = moduleName
        params.callingModuleIdentifierColumn = args.firstModuleIdentifierColumn
        params.callingModuleName = moduleName
  
        var newShowFileContent = await request_manager.submitPostRequest(args.apiUrl, params, false).catch((err) => {
            throw err;
        })

        await file_manager.upsertFile(showFilePathFirstModule, newShowFileContent).catch((err) => {
            throw err;
        })

        //STEP 4:  Update controller file for second (child) module 
        moduleName = secondModuleName;
        altModule  = firstModuleName;
        controllerFileName = moduleName.charAt(0).toUpperCase() + moduleName.slice(1)
        controllerPath = localFrameworkPath + path.sep + 'modules' + path.sep + moduleName + path.sep + 'controllers' + path.sep + controllerFileName + '.php'

        //get the content for the  controller...
        oldControllerContent = await file_manager.readTheFile(controllerPath).catch((err) => {
            throw err;
        })

        //getting controller code from api 
        params.typeOfFile = 'controller';
        params.oldContent = oldControllerContent
        params.altModuleForeignKey = moduleName + '_id'
        params.altModule = altModule 
        params.altModuleIdentifierColumn_name = args.secondModuleIdentifierColumn
        params.callingModuleForeignKey = altModule + '_id'
        params.callingModule = moduleName
        params.callingModuleIdentifierColumn = args.firstModuleIdentifierColumn
        params.callingModuleName = moduleName

        newFileContent = await request_manager.submitPostRequest(args.apiUrl, params, false).catch((err) => {
            throw err;
        })

        await file_manager.upsertFile(controllerPath, newFileContent).catch((err) => {
            throw err;
        })

        //STEP 5: Update the create file for the second module 
        var createFileName = 'create'
        var createPath = localFrameworkPath + path.sep + 'modules' + path.sep + moduleName + path.sep + 'views' + path.sep + createFileName + '.php'

        //get the new file content from the API
        var oldCreateContent = await file_manager.readTheFile(createPath).catch((err) => {
            throw err;
        })

        //get new create file code for the second module 
        params.typeOfFile = 'create'
        params.oldContent = oldCreateContent

        var newCreateContent = await request_manager.submitPostRequest(args.apiUrl, params, false).catch((err) => {
            throw err;
        })

        await file_manager.upsertFile(createPath, newCreateContent).catch((err) => {
            throw err;
        })        

        //STEP 6: Add additional column onto second module table
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

        targetTable = secondModuleName;
        targetColumn = firstModuleName + '_id'
     
        //make sure the child module has a foreign key
        await db_manager.makeSureGotColumn(targetTable, targetColumn, dbSettings).catch((err) => {
            throw err;
        })

        return args;
    },

    generateManyToMany: async (args) => {

        //STEP 1: clarify important data 
        var tempParams = args.tempParams;
        var localFrameworkPath = args.localFrameworkPath
        var firstModuleName = tempParams.firstModule;
        var secondModuleName = tempParams.secondModule;
        var firstModuleIdentifierColumn = tempParams.firstModuleIdentifierColumn
        var secondModuleIdentifierColumn = tempParams.secondModuleIdentifierColumn

        var showFilePathFirstModule = localFrameworkPath + path.sep + 'modules' + path.sep + firstModuleName + path.sep + 'views' + path.sep + 'show.php'
        var showFilePathSecondModule = localFrameworkPath + path.sep + 'modules' + path.sep + secondModuleName + path.sep + 'views' + path.sep + 'show.php'
        var relationshipType = tempParams.submittedRelationType;
        var assocModuleDirName = 'module_relations'

        //but before we can do that, we need to get the 'show' file content for both modules
        args.localFrameworkPath = localFrameworkPath
        args.showFileContentsFirstModule = await file_manager.readTheFile(showFilePathFirstModule)
        .catch((err) => {
            throw err
        })

        args.showFileContentsSecondModule = await file_manager.readTheFile(showFilePathSecondModule)
        .catch((err) => {
            throw err
        })

        //let's clarify some 'args' data
        var entityData = await initExtractSingularAndPlural(args.showFileContentsFirstModule, args.showFileContentsSecondModule)
        
        args.firstModuleSingular = entityData[0]['singular']
        args.firstModulePlural = entityData[0]['plural']
        args.secondModuleSingular = entityData[1]['singular']
        args.secondModulePlural = entityData[1]['plural']
        args.relationshipType = relationshipType
        args.firstModuleName = firstModuleName
        args.secondModuleName = secondModuleName
        args.firstModuleIdentifierColumn = firstModuleIdentifierColumn
        args.secondModuleIdentifierColumn = secondModuleIdentifierColumn  

        args.settingsPath = getRelationsFileSettingsPath(localFrameworkPath, firstModuleName, secondModuleName)
        
        //STEP 3:  Create The settings file for inside the module relations module.
        await file_manager.createRelationSettingsFile(args)
        .catch((err) => {
            throw err;
        })

        //STEP 4:  Update the 'show' file for the first module
        args.relationshipType = 'many to many'
        args.bridgingTblRequired = 'true'
        args.oldContent = args.showFileContentsFirstModule
        args.firstModule = args.firstModuleName
        args.secondModule = args.secondModuleName
        args.targetModule = 'firstModule'

        var params = {
            code: 'MRL_PLEASE_REWRITE',
            relationshipType,
            typeOfFile: 'show',
            firstModule: args.firstModuleName,
            secondModule: args.secondModuleName,
            firstModuleIdentifierColumn,
            secondModuleIdentifierColumn,
            targetModule: 'firstModule',
            oldContent: args.oldContent,
            bridgingTblRequired: 'true'
        }

        var newShowFileContent = await request_manager.submitPostRequest(args.apiUrl, params, false).catch((err) => {
            throw err;
        })

        await file_manager.upsertFile(showFilePathFirstModule, newShowFileContent).catch((err) => {
            throw err;
        })

        //STEP 5:  Update the 'show' file for the second module
        params.oldContent = args.showFileContentsSecondModule;
        params.targetModule = 'secondModule'

        var newShowFileContentTwo = await request_manager.submitPostRequest(args.apiUrl, params, false).catch((err) => {
            throw err;
        })

        await file_manager.upsertFile(showFilePathSecondModule, newShowFileContentTwo).catch((err) => {
            throw err;
        })

        return args;
    }

}