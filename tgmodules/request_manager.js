const request = require('request')

function submitPostRequest(targetUrl, params, showFeedback) {

    return new Promise((resolve, reject) => {

/*
    console.log('**************************************');
    showFeedback = true;
    console.log(targetUrl);
    console.log(JSON.stringify(params));
    console.log('**************************************');
*/

        request.post(targetUrl, {
          json: params
        }, (error, res, body) => {
          if (error) {
            reject(error);
          } else {

            if (showFeedback == true) {
                console.log('RESPONSE: ')
                console.log(body)
                console.log('###########################')
                console.log('###########################')
                console.log('##### END OF RESPONSE #####')
                console.log('###########################')
                console.log('###########################')
            }
            
            resolve(body);
          }
        })


    })
}

function submitGetRequest(targetUrl, showFeedback) {
    return new Promise((resolve, reject) => {
        request.get(targetUrl, (error, res, body) => {
          if (error) {
            reject(error);
          } else {

            if (showFeedback == true) {
                console.log('RESPONSE: ')
                console.log(body)
                console.log('###########################')
                console.log('###########################')
                console.log('##### END OF RESPONSE #####')
                console.log('###########################')
                console.log('###########################')
            }
            
            resolve(body);
          }
        })        
    })    
}

module.exports = {

    submitPostRequest: async (targetUrl, params, showFeedback=false) => {

        if (showFeedback == true) {

            console.log('>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>')
            console.log('>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>')
            console.log('>>>> START OF HTTP POST REQUEST >>>>')
            console.log('>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>')
            console.log('>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>')
            
            console.log('~~~~~~~~~~~~~~~~~~~~');
            console.log('targetUrl: ' + targetUrl)
            console.log('submitting post request with');
            console.log(JSON.stringify(params));
            console.log('~~~~~~~~~~~~~~~~~~~~');
        }

        var body = await submitPostRequest(targetUrl, params, showFeedback)
        return body
    },

    submitGetRequest: async (targetUrl, showFeedback=false) => {

        if (showFeedback == true) {

            console.log('>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>')
            console.log('>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>')
            console.log('>>>> START OF HTTP GET REQUEST >>>>')
            console.log('>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>')
            console.log('>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>')
            
            console.log('~~~~~~~~~~~~~~~~~~~~');
            console.log('targetUrl: ' + targetUrl)
            console.log('submitting get request');
            console.log('~~~~~~~~~~~~~~~~~~~~');
        }

        var body = await submitGetRequest(targetUrl, showFeedback)
        return body
    },



}