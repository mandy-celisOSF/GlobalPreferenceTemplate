<script runat=server language="JavaScript">
  Platform.Load("Core","1.1");
  Platform.Response.SetResponseHeader("Strict-Transport-Security","max-age=200");
  Platform.Response.SetResponseHeader("X-XSS-Protection","1; mode=block");
  Platform.Response.SetResponseHeader("X-Frame-Options","Deny");
  Platform.Response.SetResponseHeader("X-Content-Type-Options","nosniff");
  Platform.Response.SetResponseHeader("Referrer-Policy","strict-origin-when-cross-origin");
  Platform.Response.SetResponseHeader("Content-Security-Policy","default-src 'self'");
  var response = {};
  try {    
   var requestData = Platform.Function.ParseJSON(Platform.Request.GetPostData());

   /*  var requestData = {
      action: "Delete",
      type: "Category",
      updateData: {
        Category_ID: "NEW_ID",
        Category_Index: "3",
        Category_Label: "A new category"
      },
      categories_de: {
        key: "BU_Preference_Categories"
      },
      preferences_de: {
        key: "BU_Preferences"
      },
      BU_ID: "6371774",
      prev_ID: ""
    }
    
    */

  /*  var requestData = {
      action: "Edit",
      type: "Preference",
      updateData: {
        Preference_ID: "Interest_Offers",
        Category_ID: "Interests",
        Preference_Label: "Offers",
        Language_Code: "en_AU",
        Preference_Type: "Boolean",
        Default_Values: "True"
      },
      categories_de: {
        key: "BU_Preference_Categories"
      },
      preferences_de: {
        key: "BU_Preferences"
      },
      preferences_labels_de: {
        key: "Preference_Labels"
      },
      master_preferences_de: {
       key:"Master_Preferences"
      },
      BU_ID: "6371774",
      prev_ID: "Interest_Offers2"
    }

    */
    
    if (!requestData.action) {
      throw 'No action provided';
    }
    if (!requestData.type) {
      throw 'No type provided';
    }
    if(!requestData.updateData){
      throw 'No data provided.';
    }

    /* event and error logging DE and vars */
    var eventLogDE = DataExtension.Init('Preference_Event_Log');
    var eventName = "Update";
    var errorLogDE = DataExtension.Init('Preference_Error_Log');
    var errorValue;
    var time = Now();
    var eventDate = Platform.Function.SystemDateToLocalDate(time);
    var customer_id = "Admin";
    
    /* look up and update customer DE if customer info available */
    var categories_de = DataExtension.Init(requestData.categories_de.key);  
    var preferences_de = DataExtension.Init(requestData.preferences_de.key);
    var buId = requestData.BU_ID;

    if (requestData.type == "Category") {
      // CATEGORY processing
      var categoryId = requestData.updateData.Category_ID;
      var categoryIndex = requestData.updateData.Category_Index;
      var categoryLabel = requestData.updateData.Category_Label;
    
    if (requestData.action == "Add") {
      var addCategoryRow = categories_de.Rows.Add({"BU_ID": buId, 
      "Category_ID": categoryId, 
      "Category_Index": categoryIndex,
      "Category_Label" : categoryLabel});

      if(addCategoryRow == 1){
        var logEvent = eventLogDE.Rows.Add({
            "Customer_ID" : customer_id,
            "Preference_ID" : categoryId,
            "Event_Name" : "Add category",
            "Event_Date" : eventDate
        });
        response.status = 'OK';
      } else {
        // log error
          errorValue = "Error adding category";
          var logError = errorLogDE.Rows.Add({
           "Customer_ID" : customer_id,
            "Preference_ID" : categoryId,
            "Error_Value" : errorValue,
             "Event_Date" : eventDate
         })
      }
      
    } else if (requestData.action == "Edit") {
      //if edit update row
      var previousCategoryID = requestData.prev_ID;
      var updateCategoryRow = categories_de.Rows.Update({"BU_ID": buId, 
      "Category_ID": categoryId, 
      "Category_Index": categoryIndex,
      "Category_Label" : categoryLabel}, ["BU_ID", "Category_ID"], [buId, previousCategoryID]);

      var logEvent = eventLogDE.Rows.Add({
        "Customer_ID" : customer_id,
        "Preference_ID" : categoryId,
        "Event_Name" : "Update category",
        "Event_Date" : eventDate
      });
      
      if (categoryId !== previousCategoryID) {
        //update BU_Preferences records with new Category ID if changed
        var preference_rows = preferences_de.Rows.Update({"Category_ID": categoryId}, 
                                                         ["BU_ID", "Category_ID"], 
                                                         [buId,previousCategoryID]);

        if(preference_rows > 0){
          var logEvent = eventLogDE.Rows.Add({
              "Customer_ID" : customer_id,
              "Preference_ID" : categoryId,
              "Event_Name" : "Update BU preference category",
              "Event_Date" : eventDate
          });
      } else {
        //error updating both
        errorValue = "Error updating BU preference category";
          var logError = errorLogDE.Rows.Add({
           "Customer_ID" : customer_id,
            "Preference_ID" : categoryId,
            "Error_Value" : errorValue,
             "Event_Date" : eventDate
         })
      }
    }
      response.status = 'OK';
  
      } else {
        //delete action
        //retrieve rows from BU_Preferences matching category to be deleted
        var preference_category_filter = {
          LeftOperand:{
            Property:"BU_ID",
            SimpleOperator:"equals",
            Value: buId
          },
          LogicalOperator:"AND",
          RightOperand:{
            Property:"Category_ID",
            SimpleOperator:"equals",
            Value: categoryId
          }
        };
        var preference_rows = preferences_de.Rows.Retrieve(preference_category_filter);
        response.inUse = preference_rows.length;
        //if none, delete from categories DE
      if (preference_rows.length == 0) {
          var deleteRow = categories_de.Rows.Remove(["BU_ID", "Category_ID"],[buId,categoryId]);

          if(deleteRow == 1){
            var logEvent = eventLogDE.Rows.Add({
                "Customer_ID" : customer_id,
                "Preference_ID" : categoryId,
                "Event_Name" : "Delete category",
                "Event_Date" : eventDate
            });
            response.status = 'OK';
          } else {
            // log error
              errorValue = "Error deleting category";
              var logError = errorLogDE.Rows.Add({
               "Customer_ID" : customer_id,
                "Preference_ID" : categoryId,
                "Error_Value" : errorValue,
                 "Event_Date" : eventDate
             })
          }
        } else {
        response.status = 'FieldInUse';
      } 
    }
  } else {
    // PREFERENCE processes
    var labels_de = DataExtension.Init(requestData.preferences_labels_de.key);
    var master_preferences_de = DataExtension.Init(requestData.master_preferences_de.key);
    
    var preferenceId = requestData.updateData.Preference_ID;
    var categoryId = requestData.updateData.Category_ID;
    var languageCode = requestData.updateData.Language_Code;
    var preferenceType = requestData.updateData.Preference_Type;
    var defaultValues = requestData.updateData.Default_Values;
    var labelValues = requestData.updateData.Preference_Label;

    if (requestData.action == "Add") {
      //add to preferences 
      var addPreferenceRow = preferences_de.Rows.Add({"BU_ID": buId,
      "Preference_ID" : preferenceId,
      "Category_ID" : categoryId,
      "Preference_Type" : preferenceType,
      "Default_Values" : defaultValues
    })
      //add to labels
      var addLabelRow = labels_de.Rows.Add({"BU_ID": buId,
      "Preference_ID" : preferenceId,
      "Language_Code" : languageCode,
      "Label_Values" : labelValues
      })

      if (addPreferenceRow > 0 && addLabelRow > 0) {
          var logEvent = eventLogDE.Rows.Add({
              "Customer_ID" : customer_id,
              "Preference_ID" : preferenceId,
              "Event_Name" : "Add preference",
              "Event_Date" : eventDate
          });
          response.status = 'OK';
      } else {
        // log error
          errorValue = "Error adding preference and label";
          var logError = errorLogDE.Rows.Add({
           "Customer_ID" : customer_id,
            "Preference_ID" : preferenceId,
            "Error_Value" : errorValue,
             "Event_Date" : eventDate
         })
      }
    } else if (requestData.action == "Edit") {
      //if edit update row
      var previousPreferenceID = requestData.prev_ID;
      var updatePreferenceRow = preferences_de.Rows.Update({"BU_ID": buId, 
      "Preference_ID": preferenceId, 
      "Category_ID": categoryId,
      "Preference_Type" : preferenceType,
      "Default_Values" : defaultValues}, ["BU_ID", "Preference_ID"], [buId, previousPreferenceID]);

      var logEvent = eventLogDE.Rows.Add({
        "Customer_ID" : customer_id,
        "Preference_ID" : preferenceId,
        "Event_Name" : "Update preference",
        "Event_Date" : eventDate
      });
      
      if (preferenceId !== previousPreferenceID) {
        //update Master Preferences records with new Preference ID if changed
        var master_preference_rows = master_preferences_de.Rows.Update({"Preference_ID": preferenceId}, 
                                                         ["BU_ID", "Preference_ID"], 
                                                         [buId,previousPreferenceID]);
        //update labels 
        var updateLabelRow = labels_de.Rows.Update({"Preference_ID": preferenceId, "Label_Values": labelValues}, ["BU_ID", "Preference_ID", "Language_Code"],[buId, previousPreferenceID,languageCode]);

      if (master_preference_rows > 0 && updateLabelRow > 0) {
        var logEvent = eventLogDE.Rows.Add({
          "Customer_ID" : customer_id,
          "Preference_ID" : preferenceId,
          "Event_Name" : "Update master preference ID and label",
          "Event_Date" : eventDate
        });
        response.status = 'OK';
      } else {
        errorValue = "Error updating master preference ID and label";
          var logError = errorLogDE.Rows.Add({
           "Customer_ID" : customer_id,
            "Preference_ID" : preferenceId,
            "Error_Value" : errorValue,
             "Event_Date" : eventDate
         })
      }
      } else {
        var updateLabelRow = labels_de.Rows.Update({"Label_Values": labelValues}, ["BU_ID", "Preference_ID", "Language_Code"],[buId, preferenceId,languageCode]);

        if (updatePreferenceRow > 0 && updateLabelRow > 0) {
          var logEvent = eventLogDE.Rows.Add({
            "Customer_ID" : customer_id,
            "Preference_ID" : preferenceId,
            "Event_Name" : "Update master preference label",
            "Event_Date" : eventDate
          });
          response.status = 'OK';
        } else {
          errorValue = "Error updating master preference label";
            var logError = errorLogDE.Rows.Add({
             "Customer_ID" : customer_id,
              "Preference_ID" : preferenceId,
              "Error_Value" : errorValue,
               "Event_Date" : eventDate
           })
        }
      }
    } else {
      //delete action
      //retrieve rows from Master_Preferences matching preference to be deleted
      var master_preference_filter = {
        LeftOperand:{
          Property:"BU_ID",
          SimpleOperator:"equals",
          Value: buId
        },
        LogicalOperator:"AND",
        RightOperand:{
          Property:"Preference_ID",
          SimpleOperator:"equals",
          Value: preferenceId
        }
      };

      var master_preference_rows = master_preferences_de.Rows.Retrieve(master_preference_filter);
        response.inUse = master_preference_rows.length;
        //if none, delete from BU Preferences DE
      if (master_preference_rows.length == 0) {
          var deleteRow = preferences_de.Rows.Remove(["BU_ID", "Preference_ID"],[buId,preferenceId]);
          var deleteLabel = labels_de.Rows.Remove(["BU_ID", "Preference_ID"],[buId,preferenceId]);
          
          if (deleteRow > 0 && deleteLabel > 0) {
            var logEvent = eventLogDE.Rows.Add({
              "Customer_ID" : customer_id,
              "Preference_ID" : preferenceId,
              "Event_Name" : "Delete preference",
              "Event_Date" : eventDate
          });
          response.status = 'OK';
        } else {
        // log error
          errorValue = "Error deleting preference and label";
          var logError = errorLogDE.Rows.Add({
           "Customer_ID" : customer_id,
            "Preference_ID" : preferenceId,
            "Error_Value" : errorValue,
             "Event_Date" : eventDate
         })
      }
        } else {
        response.status = 'FieldInUse';
      } 
    }
  }
  
  Write(Stringify(response));
}
  catch (err) {
    response.error = err;
    Write(Stringify(response));
  }
</script>