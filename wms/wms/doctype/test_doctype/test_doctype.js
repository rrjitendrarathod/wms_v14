// Copyright (c) 2024, Manju and contributors
// For license information, please see license.txt

frappe.ui.form.on('Test Doctype', {
	refresh: function(frm) {
		$(".layout-side-section").hide()
		const table_area = $('<div class="table-editor">').appendTo(
			frm.fields_dict.mitems.wrapper
		);

		frappe.call({
			method: "get_mitem_table_data",
			doc:frm.doc,
			callback: function(r) {
				if(r.message) {
					var html = r.message.html
					$('.table-editor').html(html)
					refresh_field("mitems");
				}
			}
		});
	}
});