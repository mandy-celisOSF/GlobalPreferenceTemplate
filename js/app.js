import { createApp } from 'vue'
  
          const app = createApp({
            data() {
              return {
                message: "New Message",
                base_config : undefined,
                urlParams : undefined,
                base_data : undefined,
                showPage : false,
                showSpinner : true,
                jsonStr : undefined,
                responseData : undefined
              }
            },
            filters: {
              pretty: function(value) {
                return JSON.stringify(value, null, 2);
              }
            },        
            methods: {
              savePreferences(event) {
                  event.preventDefault();
                  this.getPayloadForSave(this.base_config,this.base_data).then((payload)=>{
                    const headers = { "Content-Type": "application/json" };
                    console.log('JSON.stringify(payload)',JSON.stringify(payload));
                    fetch(this.base_config.pref_processing_URL, {
                      method: 'POST',
                      headers: headers,
                      body: JSON.stringify(payload)
                    }).then((response)=>response.json()).then((data)=>{
                      this.responseData = data;
                    })
                  })
              },
              getPayloadForSave(base_config,base_data){
                return new Promise(function (resolve,reject){
                    try{
                      var payload = {
                        customer_id : base_config.customer_id,
                        subscriber_BU: base_config.subscriber_BU,
                        master_preference_de : base_config.master_preferences_de,
                        preferences : []
                      };
                      base_data.preferences.forEach(pref=>{
                        payload.preferences.push(
                        {
                          Preference_ID : pref.Preference_ID,
                          Customer_ID : base_config.customer_id,
                          BU_ID : base_config.subscriber_BU,
                          Value : pref.Value.toString()
                        });
                      });
                      resolve(payload) ;
                    }
                    catch(err){
                      reject(err);
                    }
                })
              },
              getBaseData(){
                const headers = { "Content-Type": "application/json" };
                const body = {
                  customer_id : this.base_config.customer_id,
                  master_preference_de : this.base_config.master_preferences_de,
                  preferences_de : this.base_config.preferences_target_de,
                  locale: this.base_config.customer_locale,
                  buId: this.base_config.subscriber_BU,
                  master_customer_de : this.base_config.master_customer_de,
                  preferences_values_de : this.base_config.preferences_values_de,
                  preferences_labels_de : this.base_config.preferences_labels_de
                }
                  fetch(this.base_config.pref_retrievalURL, {
                    method: 'POST', // or 'PUT'
                    headers: headers,
                    body: JSON.stringify(body),
                  }).then((response) => response.json()).then(
                      (data) => {
                        console.log(data);
                        this.base_data = {};
                        this.base_data.customer = data.customer[0];
                        this.base_data.preferences = [];
                        data.preferences.forEach(pref=>{
                            var each_pref = {...pref};
                            each_pref.Value = each_pref.Value === 'True';
                            each_pref.label = data.pref_labels.filter(item=>item.Preference_ID===pref.Preference_ID)[0].Label_Values
                            each_pref.type = data.bu_preferences.filter(item=>item.Preference_ID===pref.Preference_ID)[0].Preference_Type;
                            if(each_pref.type != 'Boolean'){
                                each_pref.translated_value = data.pref_values.filter(item=>item.Preference_ID===pref.Preference_ID)[0]?.Option_Value;
                            }else{
                              each_pref.translated_value = 'True/False';
                            }
                            this.base_data.preferences.push(each_pref);
                        });
                        
                    })
                    .catch((error) => {
                      console.log('Error:', error);
                    }).finally(()=>{
                      this.showPage = true;
                      this.showSpinner = false;
                      this.jsonStr = JSON.stringify(this.base_data, null, 2);
                    });
                  
              },
              setURLParams(){
                  return new Promise((resolve,reject)=>{
                      try{
                        const urlParams = new URLSearchParams(window.location.search);
                        resolve(urlParams);
                      }catch(ex){
                        reject(ex);
                      }
                  })
              },
              setJSONConfig(urlParams){
                return new Promise(function(resolve,reject){
                    try{
                      let jsonObj = {
                        "customer_id" : urlParams.get('customer_id'),
                        "customer_locale" : urlParams.get('customer_locale')?urlParams.get('customer_locale'):'en_AU',
                        "subscriber_BU" : urlParams.get('customer_buId'),
                        "pref_retrievalURL":"https://mcpdwdml-zryw5dczwlf-f-f9kcm.pub.sfmc-content.com/sxvpd3duwja",
                        "pref_processing_URL":"https://mcpdwdml-zryw5dczwlf-f-f9kcm.pub.sfmc-content.com/nk4ctlggevc",
                        "captcha" : {
                          "key": "google_site_key"
                        },
                        "preferences_target_de" : {
                          "key":"BU_Preferences"
                        },
                        "master_preferences_de": {
                          "key":"Master_Preferences"
                        },
                        "master_customer_de" : {
                          "key":"Master_Customers"
                        },
                        "preferences_values_de" : {
                          "key":"Preference_Values"                      
                        },
                        "preferences_labels_de" : {
                          "key":"Preference_Labels",
                        },
                        "logo_url":"https://osf.digital/library/media/osf/digital/common/header/osf_digital_logo.svg?h=60&la=en-AU&w=366&hash=C9F446367B2B20D20C0DDCB57814F986C5324002",
                        "header_color":"white",
                        "footer_color":"#389ab6",
                        "footer_links" : [{
                            label : "",
                            url : "",
                            icon_url : ""
                        }],
                        "external_end_point_target_de" : null,
                        "external_service":{
                            "authURL":"",
                            "restURL":"",
                            "endPoint" : "",
                            "clientId" : "",
                            "clientSecret":""
                        }
                      }
                      resolve(jsonObj); 
                    }catch(ex){
                      reject(ex);
                    }
                })
              }
            },
          
            // Lifecycle hooks are called at different stages
            // of a component's lifecycle.
            // This function will be called when the component is mounted.
            mounted() {
              this.setURLParams().then((urlParams)=>{
                this.urlParams = urlParams;
              }).catch((err)=>{
                console.log(err);
              }).finally(()=>{
                this.setJSONConfig(this.urlParams).then((jsonConfig)=>{
                  this.base_config = jsonConfig;
                }).catch((err)=>{
                  console.log(err);
                }).finally(()=>{
                  this.getBaseData();
                });  
              })
              
            }
          })
          
          app.mount('#app')