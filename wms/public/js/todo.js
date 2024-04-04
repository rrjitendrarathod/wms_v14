frappe.ui.form.on('ToDo',  {
  setup:function(frm){
    frappe.boot.sysdefaults.date_format = "mm-dd-yyyy";
  },
  validate:function(frm) {
    if (frm.doc.date < get_today()) {
        msgprint('You can not select past date');
        validated = false;
    }
},

refresh:function(frm){

  readonly_cancelled(frm)

  three_dot_menu(frm)
    if (["Medical Coder","QA Lead"].includes(frappe.boot.wms.role_profile)){ 
      cur_frm.page.sidebar.remove();
    }

  }

});


function readonly_cancelled(frm){
  frm.fields.forEach(function(l){
  if (frm.doc.status == "Cancelled" || frm.doc.status == "Closed"){
    frm.set_df_property(l.df.fieldname, "read_only", 1);
  }
})
}


function three_dot_menu(frm){  

	if (!["HR Manager","Production Inventory Allocation","QA Inventory Allocation"].includes(frappe.boot.wms.role_profile)){
		remove_options(frm,["Copy to Clipboard","Links"]);
	
	}
}



function remove_options(frm,options){
  var three_dot_menu = frm.page.menu

  three_dot_menu.children().each(function() {
    var rename_button = $(this);
    var buttonText = rename_button.text().trim();   

    if(options.includes(buttonText)) {
      rename_button.remove();
    }
  })
}