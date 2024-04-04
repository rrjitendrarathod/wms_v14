frappe.ui.form.on('User',{
    refresh:function(frm){
        read_only_fields(frm)
        disable_edit_for_wmsmanager(frm)
        three_dot_menu(frm)
        remove_assign_to(frm)
        // role_profile(frm)
        if(frm.is_new()){
            frm.reload_doc()
        }
    }
})
    function read_only_fields(frm){
        // if (!frappe.user_roles.includes(["HR Manager","Administrator","Super Admin"]))  

        if (["Administrator"].includes(frappe.boot.wms.role_profile)){
            var fieldList = ["first_name","middle_name","last_name","username","language","time_zone","location","bio","logout_all_sessions","phone","gender","birth_date","mobile_no","mute_sounds",
            "interest","document_follow_notify","desk_theme","new_password","email_signature","thread_notify","send_me_a_copy","allowed_in_mentions"]
            fieldList.forEach(function(field) {
                if([field]){        
                    frm.set_df_property(field, "read_only",0);
                }
            })
        }

        else if((frappe.user_roles.includes("Medical Coder")) || (frappe.user_roles.includes("Super User"))|| (frappe.user_roles.includes("WMS Manager"))||
            (frappe.user_roles.includes("Production TL") )|| (frappe.user_roles.includes("QA Lead")) || (frappe.user_roles.includes("Operations Manager")) ||
            (frappe.user_roles.includes("QA Manager")) || (frappe.user_roles.includes("Department Head")) || (frappe.user_roles.includes("Production Inventory Allocation"))
            || (frappe.user_roles.includes("QA Inventory Allocation")) || (frappe.user_roles.includes("QA")))
                {
                    var fieldList = ["first_name","middle_name","last_name","username","language","time_zone","location","bio","logout_all_sessions","phone","gender","birth_date","mobile_no","mute_sounds",
                    "interest","document_follow_notify","desk_theme","new_password","email_signature","thread_notify","send_me_a_copy","allowed_in_mentions"]
                    fieldList.forEach(function(field) {
                        if([field])
                        {
                            frm.toggle_enable(field,0)
                        }
                    })
                }

        if (!has_common(frappe.user_roles, ["HR Manager", "HR User", "Administrator", "System Manager"])){
            frm.set_df_property("sb3", "hidden", 1);
        }

        if (!has_common(frappe.user_roles, ["System Manager", "Super Admin"])){
            $(".new-timeline").hide()
        }

    }

    function disable_edit_for_wmsmanager(frm){
        if (frappe.user_roles.includes("WMS Manager")  && frappe.session.user != "Administrator"){
            frm.set_df_property('enabled', 'read_only', 1)
        }

         // given password change access to Super User
         if(["Super User"].includes(frappe.boot.wms.role_profile)){
            frm.set_df_property('new_password', 'read_only', 0);
        }
        
    }

    function three_dot_menu(frm)
    {  

        $('.inner-group-button').hide()

        if(!frappe.user_roles.includes("Administrator")){
            remove_assign_to(frm,"Rename")
        }

        
        
    }



function remove_assign_to(frm){

    var three_dot_menu = frm.page.menu
    
    three_dot_menu.children().each(function() {
        var rename_button = $(this);
        var buttonText = rename_button.text().trim();       
       
        if (buttonText === "Rename") {
            rename_button.remove();
        }
    })
    
}



// function role_profile(frm) { 
//     frm.set_query("role_profile_name", function() {  
//      return {  
//       filters: [  
//        ["name", "in", ["WMS Super User", "HRMS Super User", "Super User"]]  
//       ]  
//      }  
//     });  
// }