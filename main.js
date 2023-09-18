const { app, BrowserWindow, Tray, Menu, ipcMain, screen, dialog, nativeImage } = require('electron')
const os = require("os")
const path = require('path')
//const apiUrl = 'http://localhost/trongate_live5/' + 'desktop_app_api'
const apiUrl = 'https://trongate.io/' + 'desktop_app_api';
const thisVersion = 'v1.0.005';
const openDevTools = false;
const showHttpFeedback = false
var monitorWidth
var monitorHeight
const db_manager = require("./tgmodules/db_manager.js")
const file_manager = require("./tgmodules/file_manager.js")
const framework_manager = require("./tgmodules/framework_manager.js")
const image_manager = require("./tgmodules/image_manager.js")
const module_market = require("./tgmodules/module_market.js")
const module_manager = require("./tgmodules/module_manager.js")
const relations_manager = require("./tgmodules/relations_manager.js")
const request_manager = require("./tgmodules/request_manager.js")
const version_manager = require("./tgmodules/version_manager.js")

ipcMain.on('online-status-channel', (event, status) => {
  if (status == 'offline') {
    quitTrongate()
  } else {

    setTimeout(() => {
      introWindow.close()
      introWindow = null;
    }, 7000);

    loadFirstWindow()

  }
})

function processInboundAction(args, targetWindow) {
  var action = args.action;

  var action = args.action
    switch(action) {
      case 'isDbNameAvailable':
        isDbNameAvailable(args, targetWindow)
        break
      case 'initSelectDir':
        initSelectDir(args, targetWindow)
        break
      case 'makeItSo':
        generateNewApp(args, targetWindow);
        break;
      case 'openSecondaryWindow':
        openSecondaryWindow(args);
        break;
      case 'closeSecondaryWindow':
        closeSecondaryWindow();
        break;
      case 'closeSecondaryOpenBrowserThenQuit':
        closeSecondaryOpenBrowserThenQuit(args);
        break;
      case 'closeSecondaryOpenBrowserThenHome':
        closeSecondaryOpenBrowserThenHome(args);
        break;
      case 'openBrowser':
        openBrowser(args, targetWindow);
        break;
      case 'loadTables':
        attemptLoadTables(args, targetWindow);
        break;
      case 'selectExistingApp':
       selectExistingApp(targetWindow);
       break;
      case 'quit':
       quitTrongate();
       break;
      case 'hideWindow':
       hideWindow(targetWindow);
       break;
      case 'attemptAutoInstallFreeModule':
       initAttemptAutoInstallFreeModule(args, targetWindow);
       break;
      case 'attemptAutoInstallFreeTheme':
       initAttemptAutoInstallFreeTheme(args, targetWindow);
       break;
      case 'attemptNormalDownloadFreeItem':
       attemptNormalDownloadFreeItem:
       initAttemptNormalDownloadFreeItem(args, targetWindow);
       break;
      case 'deleteModule':
       initSelectModule(args, 'deleteModule');
       break;
      case 'createImageUploader':
       initSelectModule(args, 'createImageUploader');
       break;
      case 'submitModuleToDelete':
       initSubmitModuleToDelete(args);
       break;
      case 'submitRelationType':
       initSubmitRelationType(args);
       break;
      case 'downloadedGenereatedModule':
       downloadedGenereatedModule(args);
       break;
      case 'ignoreThisVersion':
       ignoreThisVersion(args);
       break;
      case 'updateFramework':
       updateFramework(args);
       break;
      case 'initRequestSelectFirstModuleIC':
       initRequestSelectFirstModuleIC(args);
       break;
      case 'initRequestSelectSecondModuleIC':
       initRequestSelectSecondModuleIC(args);
       break;
      case 'genModRelation':
       genModRelation(args);
       break;
      case 'generateUploader':
       generateUploader(args);
       break;
      case 'generateMultiUploader':
       generateMultiUploader(args);
       break;
      default:
        console.log('no reponse set (on main) for ' + action)
        break  
    }   
}

function generateNewApp(args, targetWindow) {
  framework_manager.downloadNewApp(args).then(() => {
    pleaseDoContinue(targetWindow, '')
  }).catch((err) => {
    var errorMsg = err
    var btnText = 'Okay'
    invokeErrorMsg(targetWindow, err, 'okay')
  })
}

var contextMenu = Menu.buildFromTemplate([
    {
        label: 'Hide',
        click: function() {
            initHide();
        }
    },
    {
        label: 'Show',
        click: function() {
            initShow();
        }
    },
    {
        label: 'Reset',
        click: function() {
            restart();
        }
    },
    {
        label: 'Quit',
        click: function() {
            quitTrongate()
        }
    }
])

function createWindow () {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    }
  })

  win.loadFile('index.html')
}

app.whenReady().then(() => {
  app.commandLine.appendSwitch ("disable-http-cache");
  var monitor = screen.getPrimaryDisplay().workAreaSize
  monitorWidth = monitor.width
  monitorHeight = monitor.height
  createTray()
  createWindow()
})

function createTray() {
  if (process.platform == 'darwin') { //Mac
      var appToolTip = 'Trongate'
      var iconImg = 'icon_16x16.png'
  } else {
      var appToolTip = 'Trongate (right click for options)'
      var iconImg = 'icon_windows20x20.png'
  }

  const trayIcon = nativeImage.createFromPath(`${__dirname}/images/${iconImg}`)
  tray = new Tray(trayIcon)
  tray.setToolTip(appToolTip)
  tray.setContextMenu(contextMenu)
}

function createWindow() {

  var screenDimensions = {
      width: 600,
      height: 420,
      zoomFactor: 1
  }
  
  var type = os.type()
  var defaultSmallWindowSettings = {
                                      webPreferences: {
                                      nodeIntegration: true,
                                      contextIsolation: false
                                   },
                                      show: false,
                                      width: screenDimensions.width,
                                      height: screenDimensions.height,
                                      backgroundColor: '#000000',
                                      frame: false
                                  }

  if (type == 'Linux') {
      defaultSmallWindowSettings.icon = path.join(__dirname, '/images/icon_128x128.png')
  }

  introWindow = new BrowserWindow(defaultSmallWindowSettings)

  var introPage = 'intro.html'

  introWindow.on('show', function () {
      contextMenu.items[0].visible = false
      contextMenu.items[1].visible = false
      contextMenu.items[2].visible = false
      contextMenu.items[2].visible = false
      tray.setContextMenu(contextMenu)
  })

  introWindow.once("ready-to-show", () => {
      introWindow.webContents.setZoomFactor(screenDimensions.zoomFactor)
      introWindow.show()

      //electron open dev tools
      if (openDevTools == true) {
          introWindow.webContents.openDevTools()
      }
      
  })

  // and load the index.html of the app.
  introWindow.loadFile(introPage)
}

function quitTrongate() {
    app.quit()
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

async function loadFirstWindow() {

  contextMenu.items[0].visible = true
  contextMenu.items[1].visible = false
  contextMenu.items[2].visible = true
  contextMenu.items[3].visible = true
  tray.setContextMenu(contextMenu)

  var params = {
    code: 'lDFRST',
    thisVersion,
    monitorWidth,
    monitorHeight,
    openDevTools
  }

  var args = request_manager.submitPostRequest(apiUrl, params, showHttpFeedback)
  .then((args) => {

    if ((args.action == 'openWindow') && (args.window_id == 'primary')) {
      openPrimaryWindow(args)
    }

  })
  .catch((err) => {
    invokeErrorMsg(primaryWindow, err, 'okay')
  })

}

async function openPrimaryWindow(args) {

  var screenDimensions = args.screen_dimensions
  var primaryWindowSettings = {
                                      webPreferences: {
                                      nodeIntegration: true,
                                      contextIsolation: false
                                   },
                                      show: false,
                                      width: screenDimensions.width,
                                      height: screenDimensions.height,
                                      backgroundColor: args.background_color,
                                      frame: false
                                  }


  primaryWindow = new BrowserWindow(primaryWindowSettings)
  primaryWindow.loadURL(args.html_url)

  primaryWindow.once("ready-to-show", () => {
      primaryWindow.webContents.setZoomFactor(screenDimensions.zoomFactor)
      primaryWindow.show()

        if (openDevTools == true) {
          primaryWindow.webContents.openDevTools()
        }

      watchPage(primaryWindow)
      
  })
}

async function openSecondaryWindow(args) {

  var screenDimensions = JSON.parse(args.screen_dimensions)
  var secondaryWindowSettings = {
                                      webPreferences: {
                                      nodeIntegration: true,
                                      contextIsolation: false
                                   },
                                      show: false,
                                      width: screenDimensions.width,
                                      height: screenDimensions.height,
                                      backgroundColor: args.background_color,
                                      frame: false
                                  }


  secondaryWindow = new BrowserWindow(secondaryWindowSettings)
  secondaryWindow.loadURL(args.html_url)

  secondaryWindow.once("ready-to-show", () => {
      secondaryWindow.webContents.setZoomFactor(screenDimensions.zoomFactor)
      secondaryWindow.show()

        if (openDevTools == true) {
          secondaryWindow.webContents.openDevTools()
        }

      watchPage(secondaryWindow)
      
  })
}

function watchPage(targetWindow) {
  var contents = targetWindow.webContents
  contents.executeJavaScript(`document.title = 0`)
  .then(() => {
    var windowWatcher =  setInterval(() => {
        var pageTitle = contents.getTitle()

        if (pageTitle == 'h') {
          initHide();
        }

        if (pageTitle == '1') {
            clearInterval(windowWatcher)
            readWindow(targetWindow)
        } else if (pageTitle == 'x') {
            //stop interval and close secondary window
            clearInterval(windowWatcher)
            secondaryWindow.close()
            secondaryWindow = null;
            setTimeout(() => {
              forceReset();
            }, 2000);
            
        }
    }, 1000)
  })
}

function readWindow(targetWindow) {
  targetWindow.webContents.executeJavaScript(`getLocalStorage()`).then((response) => {
    processInboundAction(response, targetWindow)
  })
  .catch((err) => {
    invokeErrorMsg(targetWindow, err, 'okay')
  })
}

async function isDbNameAvailable(args, targetWindow) {
  await db_manager.isDbNameAvailable(args).then(() => {
    pleaseDoContinue(targetWindow, '')
  }).catch((err) => {
    var errorMsg = err
    var btnText = 'Okay'
    invokeErrorMsg(targetWindow, err, 'okay')
  })
}

function pleaseDoContinue(targetWindow, value) {

  var jsStr = `pleaseDoContinue('${value}');`

  targetWindow.webContents.executeJavaScript(`${jsStr}`).then((response) => {
    watchPage(targetWindow)
  })
  .catch((err) => {
      var btnText = 'Okay'
      invokeErrorMsg(primaryWindow, err, 'okay')
  })

}

function invokeErrorMsg(targetWindow, errorMsg, btnText) {

  if (javascriptStr == null) {
    var javascriptStr = 'reset()'
  }

  var jsStr = `drawErrorPage('${errorMsg}', '${btnText}')`
  targetWindow.webContents.executeJavaScript(`${jsStr}`).then((response) => {
    watchPage(targetWindow)
  })  
}

function drawChooseAppLocation(targetWindow) {
  var jsStr = `runProc('CHNWAPLCN')`

  targetWindow.webContents.executeJavaScript(`${jsStr}`)
  .then((response) => {
    invokeErrorMsg(targetWindow, err, 'okay')
  })  
}

function initSelectDir(args, targetWindow) {
  var tempParams = JSON.parse(args.tempParams);
  var info = args.tempParams.info
  var selectorBtnText = args.tempParams.selectorBtnText

  file_manager.openSelectDir(args)
  .then((response) => {
    pleaseDoContinue(targetWindow, response)
  })
  .catch((err) => {
      var btnText = 'Okay'
      invokeErrorMsg(primaryWindow, err, 'okay')
  })
}

function closeSecondaryWindow() {
  secondaryWindow.close()
  secondaryWindow = null; 
  pleaseDoContinue(primaryWindow, '') 
}

function closeSecondaryOpenBrowserThenQuit(args) {
  secondaryWindow.close()
  secondaryWindow = null; 

  var contents = primaryWindow.webContents
  var msg = '* Opening Browser *'
  contents.executeJavaScript(`blinkTxt('${msg}');`);

  var tempParamsStr = args.tempParams;
  var params = JSON.parse(tempParamsStr);
  var targetUrl = params.targetUrl;


  require("electron").shell.openExternal(targetUrl).then(() => {
    quitTrongate();
  });

}

function closeSecondaryOpenBrowserThenHome(args) {
  secondaryWindow.close()
  secondaryWindow = null; 

  var contents = primaryWindow.webContents
  var msg = '* Opening Browser *'
  contents.executeJavaScript(`blinkTxt('${msg}');`);

  var tempParamsStr = args.tempParams;
  var params = JSON.parse(tempParamsStr);
  var targetUrl = params.targetUrl;

  require("electron").shell.openExternal(targetUrl).then(() => {
    primaryWindow.webContents.executeJavaScript('headHome();').then((response) => {
      watchPage(primaryWindow)
    })
  });  
}

function openBrowser(args, targetWindow) {
  //nextAction can be 'quit', 'closeWindow' or '' (do nothing)

  var tempParamsStr = args.tempParams;
  var params = JSON.parse(tempParamsStr);
  var targetUrl = params.targetUrl;
  var nextAction = params.nextAction;

  setTimeout(function () {
    require("electron").shell.openExternal(targetUrl);
  }, 10);

  switch(nextAction) {
    case 'quit':
     quitTrongate();
     break;
    case 'closeWindow':
     targetWindow.close()
     targetWindow = null;
     pleaseDoContinue(primaryWindow, '');
    default:
      invokeExecuteNextAction(targetWindow, nextAction);
      break 
  }
}

function invokeExecuteNextAction(targetWindow, nextAction) {
  var jsStr = `${nextAction}`;    
  targetWindow.webContents.executeJavaScript(`${jsStr}`).then((response) => {
    watchPage(targetWindow)
  })
  .catch((err) => {
    invokeErrorMsg(primaryWindow, err, 'okay')
  })
}

function extractFoundTables(rows, dbSettings) {
  return new Promise((resolve, reject) => {
    var foundTables = [];
    var targetProperty = 'Tables_in_' + dbSettings.database;

    for (var x = 0; x < rows.length; x++) {
        foundTables.push(rows[x][targetProperty])
    }

    resolve(foundTables);
  })
}

function establishTablesWithColumns(foundTables, dbSettings) {
  return new Promise((resolve, reject) => {
    //establish the table columns
    var tables = [];
    var columnsData = [];
    for (var i = 0; i < foundTables.length; i++) {
        
            var tableName = foundTables[i];
            var sql2 = 'DESCRIBE ' + foundTables[i];

            var results2 = db_manager.executeQuery(sql2, dbSettings) .
            catch ((err) => {
              invokeErrorMsg(primaryWindow, err, 'okay')
            })

            columnsData = [];
            for (var y = 0; y < results2.length; y++) {
                columnsData.push(results2[y]['Field']);
            }

            var tableObj = {
                id: tableName,
                columns: columnsData
            }

            tables.push(tableObj);
            resolve(tables);
    }
  })
}

function executeQuery(query, dbSettings) {
  return new Promise((resolve, reject) => {

    db_manager.executeQuery(query, dbSettings)
    .then((rows) => {
      resolve(rows);
    })
    .catch((err) => {
      reject(err);
    })

  })
}

function attemptLoadTables(args, targetWindow) {
  loadTables(args, targetWindow)
  .then((tables) => {
      var tablesStr = JSON.stringify(tables);
      var contents = targetWindow.webContents
      contents.executeJavaScript(`setTables('${tablesStr}');`)
      .then(() => {
        watchPage(targetWindow)
      })

  })
  .catch((err) => {
    secondaryWindow.close()
    secondaryWindow = null;
    invokeErrorMsg(targetWindow, err, 'okay')
  })
}

function buildColumnsData(columnsStr) {
  var arr = columnsStr.split (",");
  return arr;  
}

async function loadTables(args, targetWindow=null) {
  var localFrameworkPath = args.localFrameworkPath;
  var dbSettings = await getDbSettings(localFrameworkPath);
  var database = dbSettings.database;

  var query = `SELECT table_name, GROUP_CONCAT(column_name ORDER BY ordinal_position) 
               AS columnsStr  
               FROM information_schema.columns WHERE table_schema = '${database}' 
               GROUP BY table_name ORDER BY table_name`;

  var rows =  await executeQuery(query, dbSettings);
  
  var tables = [];
  for (var i = 0; i < rows.length; i++) {

    if (rows[i]['table_name']) {
      var tableName = rows[i]['table_name'];
      var columnsData = buildColumnsData(rows[i]['columnsStr']);

      var tableObj = {
          id: tableName,
          columns: columnsData
      }

      tables.push(tableObj);

    }
  }

  return tables;
}

async function loadTablesOLD(args, targetWindow=null) {
  var localFrameworkPath = args.localFrameworkPath;
  var dbSettings = await getDbSettings(localFrameworkPath);
  var query = 'SHOW TABLES'
  var rows =  await executeQuery(query, dbSettings)
  var foundTables = await extractFoundTables(rows, dbSettings);

  var tables = [];
  var columnsData = [];
  for (var i = 0; i < foundTables.length; i++) {
      
    var tableName = foundTables[i];
    var sql2 = 'DESCRIBE ' + foundTables[i];
    var results2 =  await executeQuery(sql2, dbSettings)

    columnsData = [];
    for (var y = 0; y < results2.length; y++) {
        columnsData.push(results2[y]['Field']);
    }

    var tableObj = {
        id: tableName,
        columns: columnsData
    }

    tables.push(tableObj);

  }

  return tables
}

function getDbConfigContent(dbConfigFilePath) {
  return new Promise((resolve, reject) => {
      file_manager.readTheFile(dbConfigFilePath)
      .then((dbConfigContent) => {
        resolve(dbConfigContent);
      })
      .catch((err) => {
        reject(err)
      })
  })
}

function extractDbSettings(dbConfigContent) {
  return new Promise((resolve, reject) => {
      db_manager.extractDbSettings(dbConfigContent, true)
      .then((dbSettings) => {
        resolve(dbSettings);
      })
      .catch((err) => {
        reject(err)
      })
  })
}

async function getDbSettings(localFrameworkPath) {
  //establish the dbConfigFilePath
  var dbConfigFilePath = localFrameworkPath + path.sep + 'config' + path.sep + 'database.php'

  //get the content from the database config file 
  var dbConfigContent = await getDbConfigContent(dbConfigFilePath);

  //get the settings from the content 
  var mySettings = await extractDbSettings(dbConfigContent);
  return mySettings;
}

function isValidTrongateApp(selectedDir, targetWindow) {
  framework_manager.isValidTrongateApp(selectedDir, apiUrl).then((result) => {

    if (typeof result == 'object') {
      initVersionMismatchAlert(result);
    } else {
      pleaseDoContinue(targetWindow, selectedDir);
    }

  })
  .catch((err) => {
    var errorMsg = err
    invokeErrorMsg(targetWindow, err, 'okay')
  })

}

function initVersionMismatchAlert(result) {
    var outputStr = JSON.stringify(result);

    var jsStr = `versionMismatchAlert('${outputStr}');`;    

    primaryWindow.webContents.executeJavaScript(`${jsStr}`).then((response) => {
      watchPage(primaryWindow)
    })
    .catch((err) => {
      var errorMsg = err
      invokeErrorMsg(primaryWindow, errorMsg, 'okay')
    }) 
}

function selectExistingApp(targetWindow) {
  framework_manager.chooseExistingAppLocationLocation()
  .then((selectedDir) => {
    return selectedDir;
  })
  .then((selectedDir) => {
    //check and make sure the selectedDir is a valid Trongate framework.
    var validApp = isValidTrongateApp(selectedDir, targetWindow);
  })
  .catch((err) => {
    var errorMsg = err
    invokeErrorMsg(targetWindow, err, 'okay')
  })

}

function initAttemptNormalDownloadFreeItem(args, targetWindow) {
  targetWindow.close()
  targetWindow = null;
  var contents = primaryWindow.webContents
  var msg = '~ Please Wait ~'
  contents.executeJavaScript(`blinkTxt('${msg}');`);

  setTimeout(() => {

    args.apiUrl = apiUrl;

    module_market.fetchFreeItemDownloadUrlEtc(args)
    .then((responseObj) => {
      args.responseObj = responseObj;
      initChooseLocationNormalDownloadFreeItem(args)
    })
    .catch((err) => {
        var errorMsg = err
        invokeErrorMsg(primaryWindow, err, 'okay')    
    })

  }, 1600);

}

function initChooseLocationNormalDownloadFreeItem(args) {

  var contents = primaryWindow.webContents
  var msg = '~ Select Download Location ~'
  contents.executeJavaScript(`blinkTxt('${msg}');`);

  setTimeout(() => {

    module_market.chooseDownloadLocation()
    .then((selectedDir) => {
       args.selectedDir = selectedDir;
       contents.executeJavaScript(`displayLoader();`);
       invokeFreeNormalDownload(args);
    })
    .catch((err) => {
        var errorMsg = err
        invokeErrorMsg(primaryWindow, err, 'okay')    
    })

  }, 1600);

}

function initAttemptAutoInstallFreeModule(args, targetWindow) {

  //the target window at this stage represents the module market 
  var itemTypeId = args.itemTypeId;

  if (itemTypeId == 3) {

    module_market.checkAndGetTargetModulePath(args)
    .then((targetModulePath) => {
      targetWindow.close()
      targetWindow = null;
      var contents = primaryWindow.webContents
      contents.executeJavaScript(`displayLoader();`);
      return targetModulePath;
    })
    .then((targetModulePath) => {
      args.targetModulePath = targetModulePath;
      args.apiUrl = apiUrl;
      invokeFreeAutoModuleDownload(args);
    })
    .catch((err) => {
      secondaryWindow.close()
      secondaryWindow = null; 
      var errorMsg = err
      invokeErrorMsg(primaryWindow, err, 'okay')
    })

  } else {
    console.log('attempt normal non auto install download');
  }
}

function initAttemptAutoInstallFreeTheme(args, targetWindow) {

  //the target window at this stage represents the module market 
  var itemTypeId = args.itemTypeId;

  if (itemTypeId == 2) {

    module_market.checkAndGetTargetThemePath(args)
    .then((targetThemePath) => {
      targetWindow.close()
      targetWindow = null;
      var contents = primaryWindow.webContents
      contents.executeJavaScript(`displayLoader();`);
      return targetThemePath;
    })
    .then((targetThemePath) => {
      args.targetThemePath = targetThemePath;
      args.apiUrl = apiUrl;
      invokeFreeAutoThemeDownload(args);
    })
    .catch((err) => {
      secondaryWindow.close()
      secondaryWindow = null; 
      var errorMsg = err
      invokeErrorMsg(primaryWindow, err, 'okay')
    })
  }
}

function invokeFreeNormalDownload(args) {
    module_market.downloadFreeItem(args)
    .then(() => {
      finishedDownloadFreeItem();
    })
    .catch((err) => {
      var errorMsg = err
      invokeErrorMsg(primaryWindow, errorMsg, 'okay')    
    })  
}

function invokeFreeAutoModuleDownload(args) {
  args.apiUrl = apiUrl;
  module_market.downloadFreeModule(args)
  .then((output) => {
    finishedDownloadFreeModule(output);
  })
  .catch((err) => {
    var errorMsg = err
    invokeErrorMsg(primaryWindow, errorMsg, 'okay')    
  })
}

function invokeFreeAutoThemeDownload(args) {
  args.apiUrl = apiUrl;
  module_market.downloadFreeTheme(args)
  .then(() => {
    finishedDownloadFreeItem();
  })
  .catch((err) => {
    var errorMsg = err
    invokeErrorMsg(primaryWindow, errorMsg, 'okay')    
  })
}

function finishedGenerateModule(output) {
    var outputStr = JSON.stringify(output);
    var jsStr = `generateModuleComplete('${outputStr}');`;    

    primaryWindow.webContents.executeJavaScript(`${jsStr}`).then((response) => {
      watchPage(primaryWindow)
    })
    .catch((err) => {
      var errorMsg = err
      invokeErrorMsg(primaryWindow, errorMsg, 'okay')
    })  
}

function finishedDownloadFreeModule(output) {
    var outputStr = JSON.stringify(output);
    var jsStr = `downloadModuleComplete('${outputStr}');`;    

    primaryWindow.webContents.executeJavaScript(`${jsStr}`).then((response) => {
      watchPage(primaryWindow)
    })
    .catch((err) => {
      var errorMsg = err
      invokeErrorMsg(primaryWindow, errorMsg, 'okay')
    })  
}

function finishedDownloadFreeItem() {

  var jsStr = `downloadItemComplete();`;
  primaryWindow.webContents.executeJavaScript(`${jsStr}`).then((response) => {
    watchPage(primaryWindow)
  })
  .catch((err) => {
    var errorMsg = err
    invokeErrorMsg(primaryWindow, errorMsg, 'okay')
  })   

}

function initSelectModule(args, action) {

  args.action = action;

  framework_manager.fetchAllModules(args, false)
  .then((modules) => {

    switch(action) {
      case 'deleteModule':
        initChooseModule(modules);
        break
      case 'createImageUploader':
        initChooseModule(modules);
        break 
    }   

  })
  .catch((err) => {
    var errorMsg = err
    invokeErrorMsg(primaryWindow, errorMsg, 'okay')    
  })
}

function initChooseModule(modules) {

    var modulesArrayStr = JSON.stringify(modules);
    var jsStr = `initChooseModule('${modulesArrayStr}')`;    

    primaryWindow.webContents.executeJavaScript(`${jsStr}`).then((response) => {
      watchPage(primaryWindow)
    })
    .catch((err) => {
      invokeErrorMsg(primaryWindow, err, 'okay')
    })    
}

function initSubmitModuleToDelete(args) {
  var localFrameworkPath =  args.localFrameworkPath;
  var tempParams = JSON.parse(args.tempParams);
  var selectedModule = tempParams.selectedModule;

  framework_manager.submitModuleToDelete(localFrameworkPath, selectedModule)
  .then(() => {
    var text = 'Module Successfully Deleted';
    var functionStr = 'headHome();';
    var jsStr = `drawBtnPage('${text}', '${functionStr}', 'Okay');`;

    primaryWindow.webContents.executeJavaScript(`${jsStr}`).then((response) => {
      watchPage(primaryWindow)
    })
    .catch((err) => {
      invokeErrorMsg(primaryWindow, err, 'okay')
    })

  })
  .catch((err) => {
    invokeErrorMsg(primaryWindow, err, 'okay')   
  })

}

function initSubmitRelationType(args) {
  relations_manager.initSubmitRelationType(args)
  .then((selectableModules) => {
    var value = JSON.stringify(selectableModules);
    pleaseDoContinue(primaryWindow, value);
  })
  .catch((err) => {
    invokeErrorMsg(primaryWindow, err, 'okay')
  })
}

function downloadedGenereatedModule(args) {
  args.apiUrl = apiUrl;
  module_manager.downloadedGenereatedModule(args)
  .then((output) => {
    finishedGenerateModule(output)
  })
  .catch((err) => {
    invokeErrorMsg(primaryWindow, err, 'okay')
  })
}

function ignoreThisVersion(args) {
  var args = JSON.parse(args.tempParams);

  version_manager.registerIgnoreCurrentVersion(args)
  .then((localFrameworkPath) => {
    setLocalFrameworkPathEtc(localFrameworkPath);
  })
  .catch((err) => {
    invokeErrorMsg(primaryWindow, err, 'okay')  
  })
}

function setLocalFrameworkPathEtc(localFrameworkPath) {
  var jsStr = `removeLocalStorage(); localStorage.setItem('localFrameworkPath', '${localFrameworkPath}'); headHome();`;

  primaryWindow.webContents.executeJavaScript(`${jsStr}`).then((response) => {
    watchPage(primaryWindow)
  })
  .catch((err) => {
    invokeErrorMsg(primaryWindow, err, 'okay')
  })  
}

function updateFramework(args) {
  var args = JSON.parse(args.tempParams);

  version_manager.updateFramework(args)
  .then((currentFrameworkVersion) => {
    declareFrameworkUpdated(currentFrameworkVersion);
  })
  .catch((err) => {
    invokeErrorMsg(primaryWindow, err, 'okay') 
  })
}

function declareFrameworkUpdated(currentFrameworkVersion) {
    var jsStr = `declareFrameworkUpdated('${currentFrameworkVersion}');`;

    primaryWindow.webContents.executeJavaScript(`${jsStr}`).then((response) => {
      watchPage(primaryWindow)
    })
    .catch((err) => {
      invokeErrorMsg(primaryWindow, err, 'okay')
    })

}

function initRequestSelectFirstModuleIC(args) {
  relations_manager.requestSelectableColumns(args, 'firstModule')
  .then((selectableColumns) => {
    var value =  JSON.stringify(selectableColumns);
    pleaseDoContinue(primaryWindow, value)
  })
  .catch((err) => {
    invokeErrorMsg(primaryWindow, err, 'okay')
  })
}

function initRequestSelectSecondModuleIC(args) {
  relations_manager.requestSelectableColumns(args, 'secondModule')
  .then((selectableColumns) => {
    var value =  JSON.stringify(selectableColumns);
    pleaseDoContinue(primaryWindow, value)
  })
  .catch((err) => {
    invokeErrorMsg(primaryWindow, err, 'okay')
  })
}

function genModRelation(args) {
  args.apiUrl = apiUrl;
  relations_manager.makeSureRelationAllowed(args).then((args) => {
    makeSureGotModuleRelations(args);
  })
  .catch((err) => {
    invokeErrorMsg(primaryWindow, err, 'okay') 
  })
}

function makeSureGotModuleRelations(args) { 
  relations_manager.makeSureGotModuleRelations(args).then((args) => {
    //figure out what kind of relationship this is going to be:
    var tempParams =  args.tempParams;
    var bridgingTblRequired = tempParams.bridgingTblRequired;
    var relationshipType = tempParams.submittedRelationType;

    if (relationshipType == "one to one") {

        if ((bridgingTblRequired == 'true') || (bridgingTblRequired == true) || (bridgingTblRequired == 1)) {
            relationshipType = 'one to one with bridgingTbl'
        } else {
            relationshipType = 'one to one without bridgingTbl'
        }
    }

    switch(relationshipType) {
      case 'one to one with bridgingTbl':
        generateOneToOneWithBridgingTbl(args)
        break
      case 'one to one without bridgingTbl':
        generateOneToOneWithoutBridgingTbl(args)
        break
      case 'one to many':
        generateOneToMany(args)
        break
      case 'many to many':
        generateManyToMany(args)
        break
      default:
        initErrorMsg('unknown relationship type of ' + relationshipType, 'small-window-channel')
    }  
  })
  .catch((err) => {
    invokeErrorMsg(primaryWindow, err, 'okay')
  })
}

function generateOneToOneWithBridgingTbl(args) {
  relations_manager.generateOneToOneWithBridgingTbl(args)
  .then((args) => {
    relationGenerated(args.localFrameworkPath);
  })
  .catch((err) => {
    invokeErrorMsg(primaryWindow, err, 'okay')
  })

}

function generateOneToOneWithoutBridgingTbl(args) {
  relations_manager.generateOneToOneWithoutBridgingTbl(args)
  .then((args) => {
    relationGenerated(args.localFrameworkPath);
  })
  .catch((err) => {
    invokeErrorMsg(primaryWindow, err, 'okay')
  })
}

function generateOneToMany(args) {
  relations_manager.generateOneToMany(args)
  .then((args) => {
    relationGenerated(args.localFrameworkPath);
  })
  .catch((err) => {
    invokeErrorMsg(primaryWindow, err, 'okay')
  })
}

function generateManyToMany(args) {
  relations_manager.generateManyToMany(args)
  .then((args) => {
    relationGenerated(args.localFrameworkPath);
  })
  .catch((err) => {
    invokeErrorMsg(primaryWindow, err, 'okay')
  })
}


function relationGenerated(localFrameworkPath) {

  framework_manager.returnAppBaseUrl(localFrameworkPath)
  .then((baseUrl) => {

    var jsStr = `relationGenerated('${baseUrl}');`;

    primaryWindow.webContents.executeJavaScript(`${jsStr}`).then((response) => {
      watchPage(primaryWindow)
    })

  })
  .catch((err) => {
    invokeErrorMsg(primaryWindow, err, 'okay')
  })
 
}

function generateUploader(args) {
  args.apiUrl = apiUrl;
  image_manager.generateImageUploader(args)
  .then((moduleManageUrl) => {
    uploaderGenerated(moduleManageUrl);
  })
  .catch((err) => {
    invokeErrorMsg(primaryWindow, err, 'okay')
  })
}

function generateMultiUploader(args) {
  args.apiUrl = apiUrl;
  image_manager.generateMultiUploader(args)
  .then((moduleManageUrl) => {
    uploaderGenerated(moduleManageUrl);
  })
  .catch((err) => {
    invokeErrorMsg(primaryWindow, err, 'okay')
  })  
}

function uploaderGenerated(moduleManageUrl) {

  var jsStr = `uploaderGenerated('${moduleManageUrl}');`;

  primaryWindow.webContents.executeJavaScript(`${jsStr}`).then((response) => {
    watchPage(primaryWindow)
  })

}

function restart() { 
    if (typeof secondaryWindow !== 'undefined') {
        var jsStr = ` document.title = 'x';`
        secondaryWindow.webContents.executeJavaScript(`${jsStr}`).then((response) => {
          reactivatePrimaryWindow();
        })        
    } else {
        forceReset();
    }
}

function reactivatePrimaryWindow() {
  watchPage(primaryWindow)
}

function forceReset() {
    var jsStr = `reset();`
    primaryWindow.webContents.executeJavaScript(`${jsStr}`).then((response) => {
        //watchPage(primaryWindow)
    }).catch((err) => {
        invokeErrorMsg(primaryWindow, err, 'okay')
    })
}

function drawChooseAppLocation(targetWindow) {
  var jsStr = `runProc('CHNWAPLCN')`

  targetWindow.webContents.executeJavaScript(`${jsStr}`)
  .then((response) => {
    invokeErrorMsg(targetWindow, err, 'okay')
  }) 
}

function initHide() {

  primaryWindow.webContents.executeJavaScript(`document.title = 0`)
  .then((response) => {
    primaryWindow.hide()
    contextMenu.items[0].visible = false
    contextMenu.items[1].visible = true
    contextMenu.items[2].visible = false
    contextMenu.items[3].visible = true
    tray.setContextMenu(contextMenu)
  })

}

function initShow() {
  contextMenu.items[0].visible = true
  contextMenu.items[1].visible = false
  contextMenu.items[2].visible = true
  contextMenu.items[3].visible = true
  tray.setContextMenu(contextMenu)

  primaryWindow.show()

  var jsStr = `document.activeElement.blur();`
  primaryWindow.webContents.executeJavaScript(`${jsStr}`)
}