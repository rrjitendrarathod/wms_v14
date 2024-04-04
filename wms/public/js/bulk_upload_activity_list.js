// frappe.views.ListView.prototype.set_fields = function () {
//     let fields = [].concat(
//         frappe.model.std_fields_list,
//         this.get_fields_in_list_view(),
//         [this.meta.title_field, this.meta.image_field],
//         this.settings.add_fields || ["assigned_to"],
//         this.meta.track_seen ? "_seen" : null,
//         this.sort_by,
//         "enabled",
//         "disabled",
//         "color"
//     );
//     fields.forEach((f) => this._add_field(f));
    
//     this.fields.forEach((f) => {
//         const df = frappe.meta.get_docfield(f[1], f[0]);
//         if (
//         df &&
//         df.fieldtype === "Currency" &&
//         df.options &&
//         !df.options.includes(":")
//         ) {
//         this._add_field(df.options);
//         }
//     });
// };
      

