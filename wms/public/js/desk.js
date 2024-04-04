// frappe.Application = Class.extend({
//     set_route() {
// 		if (frappe.boot && localStorage.getItem("session_last_route")) {
// 			frappe.set_route(localStorage.getItem("session_last_route"));
// 			localStorage.removeItem("session_last_route");
// 		} else {
// 			// route to home page
// 			frappe.router.route(rhrms);
// 		}
// 		frappe.router.on('change', () => {
// 			$(".tooltip").hide();
// 		});
// 	},
// })