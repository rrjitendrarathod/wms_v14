frappe.ui.form.on("Module Profile", {
	refresh: function (frm) {
		if (has_common(frappe.user_roles, ["Administrator", "System Manager", "Super Admin"])) {
			if (!frm.module_editor && frm.doc.__onload && frm.doc.__onload.all_modules) {
				const module_area = $(frm.fields_dict.module_html.wrapper);
				frm.module_editor = new frappe.ModuleEditor(frm, module_area);
			}
		}

		if (frm.module_editor) {
			frm.module_editor.show();
		}
	}
});