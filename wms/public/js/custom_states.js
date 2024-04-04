frappe.ui.form.States = class CustomFormStates extends frappe.ui.form.States {
    show_actions() {
        // You can override the show_actions method here
        // Add your custom logic or modifications
        var added = false;
		var me = this;

		// if the loaded doc is dirty, don't show workflow buttons
		if (this.frm.doc.__unsaved === 1) {
			return;
		}

		function has_approval_access(transition) {
			let approval_access = false;
			const user = frappe.session.user;
			if (
				user === "Administrator" ||
				transition.allow_self_approval ||
				user !== me.frm.doc.owner
			) {
				approval_access = true;
			}
			return approval_access;
		}

		frappe.workflow.get_transitions(this.frm.doc).then((transitions) => {
			this.frm.page.clear_actions_menu();
			transitions.forEach((d) => {
				if (frappe.user_roles.includes(d.allowed) && has_approval_access(d)) {
					added = true;
					me.frm.page.add_action_item(__(d.action), function () {
						// set the workflow_action for use in form scripts
                        // comment due to promise method im medical coder flow

						// frappe.dom.freeze();
                        
						me.frm.selected_workflow_action = d.action;
						me.frm.script_manager.trigger("before_workflow_action").then(() => {
							frappe
								.xcall("frappe.model.workflow.apply_workflow", {
									doc: me.frm.doc,
									action: d.action,
								})
								.then((doc) => {
									frappe.model.sync(doc);
									me.frm.refresh();
									me.frm.selected_workflow_action = null;
									me.frm.script_manager.trigger("after_workflow_action");
								})
								.finally(() => {
									frappe.dom.unfreeze();
								});
						});
					});
				}
			});

			this.setup_btn(added);
		});

    }
};