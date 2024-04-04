// Copyright (c) 2016, Manju and contributors
// For license information, please see license.txt
/* eslint-disable */

frappe.query_reports["Wms Tracker"] = {
	"filters": [
		{
			fieldname:"name",
			label: __("Version Id"),
			fieldtype: "Link",
			options: "Version"
		},
		{
			fieldname:"modified_by",
			label: __("Modified"),
			fieldtype: "Link",
			options: "User"

		},
		// {
		// 	fieldname:"modified",
		// 	label: __("Modified Date"),
		// 	fieldtype: "Date",
		// 	"default": frappe.datetime.get_today()
			

		// },

	]
};
