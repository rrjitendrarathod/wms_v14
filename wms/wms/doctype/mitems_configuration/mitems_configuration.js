// Copyright (c) 2024, Manju and contributors
// For license information, please see license.txt

frappe.ui.form.on('MItems Configuration', {
	refresh: function(frm,cdt,cdn) {
        display_id_as_mitem()
        set_filtered_mitems(frm)
        set_description(frm)
        set_response_values(frm,cdt,cdn)
	},
    exclude: function(frm) {
        display_id_as_mitem()
    },
    include: function(frm) {
        display_id_as_mitem()
    },
    special_include: function(frm) {
        display_id_as_mitem()
    },
    dependent: function(frm) {
        display_id_as_mitem()
    },
    mitems: function(frm,cdt,cdn) {
        set_filtered_mitems(frm)
        set_response_values(frm,cdt,cdn)
    },
    before_save: function(frm,cdt,cdn) {
        // check_response_valuse(frm,cdt,cdn)
    }
});

function set_description(frm) {
    if (frm.is_new()){
        const field = frm.get_field('picklist');
        field.set_description(__('<p style="color: red;"><b><p></p>Save the form to add Include/Exclude values</b></p>', [frm.doc.document_type]));
    }
    else {
        const field = frm.get_field('picklist');
        field.set_description(__(' ', [frm.doc.document_type]));
    }
}

function display_id_as_mitem() {
    $(".data-pill.btn.tb-selected-value").each(function() {
        var dataValue = $(this).attr("data-value");
        
        var $linkToForm = $(this).find(".btn-link-to-form");
        
        frappe.call({
            method: "frappe.client.get_value",
            args: {
                doctype: "MItem Values", 
                filters: { "name": dataValue },  
                fieldname: "mitems"  
            },
            callback: function(response) {
                $linkToForm.text(response.message.mitems);
            }
        });
    });
}

function set_filtered_mitems(frm) {
    frm.set_query('exclude', function(doc, cdt, cdn) {
        var d = locals[cdt][cdn];
        let include_values = frm.doc.include.map(item => item.mitem)
        
        return {
            "filters": [
                ['MItem Values', "mitems", "!=", d.mitem_name],
                ['MItem Values', "name", "not in", include_values]
            ]
        };
    });

    frm.set_query('include', function(doc, cdt, cdn) {
        var d = locals[cdt][cdn];

        let exclude_values = frm.doc.exclude.map(item => item.mitem)
        
        return {
            "filters": [
                ['MItem Values', "mitems", "!=", d.mitem_name],
                ['MItem Values', "name", "not in", exclude_values]
            ]
        };
    });

    frm.set_query('special_include', function(doc, cdt, cdn) {
        var d = locals[cdt][cdn];
        
        let exclude_values = frm.doc.exclude.map(item => item.mitem)
        
        return {
            "filters": [
                ['MItem Values', "mitems", "!=", d.mitem_name],
                ['MItem Values', "name", "not in", exclude_values]
            ]
        };
    });

    frm.set_query('dependent', function(doc, cdt, cdn) {
        var d = locals[cdt][cdn];

        let include_values = frm.doc.include.map(item => item.mitem)
        let exclude_values = frm.doc.exclude.map(item => item.mitem)
        

        var combined_values = Array.from(new Set([...include_values, ...exclude_values])) || ''
        return {
            "filters": [
                ['MItem Values', "mitems", "!=", d.mitem_name],
                ['MItem Values', "name", "not in", combined_values],
            ]
        };
    });
}

function set_response_values(frm,cdt,cdn) {
    var d = locals[cdt][cdn]
    if (d.mitems) {
        frappe.call({
            method: 'wms.wms.doctype.mitems_configuration.mitems_configuration.get_sub_values',
            args: {
                parent: d.mitems
            },
            callback: (records) => {
                let sub_values = [];
                sub_values.push('');
                records.message.forEach(element => {
                    sub_values.push(element);
                });
                sub_values.sort();
                frm.set_df_property('redroad_coder_response', 'options', sub_values);
            },
        })
    }
    if(!(d.mitems)) {
        frm.set_value(frm.set_df_property('redroad_coder_response', 'options', ''))
    }
}

function check_response_valuse(frm,cdt,cdn) {
    var d = locals[cdt][cdn]
    
    if (!(d.redroad_coder_response)){
        frappe.validated = false;
        frappe.warn('Are you sure you want to proceed?',
        'There is no coder response for the mitem <b> ' + d.mitems + ' </b>',
        () => {
            // false;
        },
        'Continue',
        true
        )
    }
}