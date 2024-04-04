// Copyright (c) 2022, Manju and contributors
// For license information, please see license.txt

frappe.ui.form.on('MItem Values', {
	before_save:function(frm){
		var payor_type = cur_frm.doc.payortype.slice(0,2);
		var assessment = cur_frm.doc.assessment_type.slice(0,2);

		var main_value = payor_type + assessment;
		frm.set_value("naming",main_value);
	  cur_frm.set_df_property("naming", "read_only",1);
	},
	refresh: function(frm) {
		create_mitem_conf(frm)
	}
});

function create_mitem_conf(frm) {
	if (!frm.is_new()) {
		frm.add_custom_button(__("Create Configuration"), function() {
			frappe.new_doc("MItems Configuration", {
				'mitems':frm.doc.name,
				'picklist': frm.doc.picklist
			});
		})
	}
}