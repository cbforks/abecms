var template = $('#hds-workflows').html();

function mountWorkflows (data) {
	console.log(data)
	for (var i in data.roles) {
		let role = data.roles[i]

		var divRoleWrapper = $('<div class="role-wrapper"></div>');
		var divContentWorkflows = $(`<div class="role-name">${role.name}</div>`)
		var divWorkflowFlex = $(`<div class="workflow-flex">`)

		var divWorkflowWrapper = $(`<div class="workflow-wrapper"></div>`)
		var divWorkflowBoxDraft = $(`<div class="workflow-box"></div>`)

		var divWorkflowTitleDraft = $(`<div class="workflow-title">draft :</div>`)

		var divWorkflowActifs = []
		for (var i in data.workflowUrl.draft) {
			var wurl = data.workflowUrl.draft[i]
			console.log(wurl)
			if (wurl.action == "edit") {
				divWorkflowActifs.push($(`<div class="workflow-actif">edit in <b>${wurl.workflow}</b></div>`))
			}
			else if (wurl.action == "previous") {
				divWorkflowActifs.push($(`<div class="workflow-actif">to <b>${wurl.previous}</b> status</div>`))
			}
			else if (wurl.action == "submit") {
				divWorkflowActifs.push($(`<div class="workflow-actif">to <b>${wurl.next}</b> status</div>`))
			}
			else if (wurl.action == "delete") {
				divWorkflowActifs.push($(`<div class="workflow-actif">delete</div>`))
			}
		}

		var divWorkflowTitlePublish = $(`<div class="workflow-title">publish :</div>`)

		var divWorkflowBoxPublish = $(`<div class="workflow-box"></div>`)

		var divWorkflowActifsPublish = []

		for (var i in data.workflowUrl.publish) {
			var xurl = data.workflowUrl.publish[i]
			console.log(wurl)
			if (xurl.action == "edit") {
				divWorkflowActifsPublish.push($(`<div class="workflow-actif">edit in <b>${xurl.workflow}</b></div>`))
			}
			else if (xurl.action == "reject") {
				divWorkflowActifsPublish.push($(`<div class="workflow-actif">reject to <b>${xurl.previous}</b> status</div>`))
			}
			else if (xurl.action == "submit") {
				divWorkflowActifsPublish.push($(`<div class="workflow-actif">submit to <b>${xurl.next}</b> status</div>`))
			}
			else if (xurl.action == "delete") {
				divWorkflowActifsPublish.push($(`<div class="workflow-actif">delete</div>`))
			}
		}

		divWorkflowActifsPublish.push($(`<div class="workflow-actif">unpublish</div>`))


		// DRAFT
		divWorkflowBoxDraft.append(divWorkflowTitleDraft, divWorkflowActifs)
		divWorkflowWrapper.append(divWorkflowBoxDraft)
		divWorkflowFlex.append(divWorkflowWrapper)
		divRoleWrapper.append(divContentWorkflows, divWorkflowFlex)

		// PUBLISH
		divWorkflowBoxPublish.append(divWorkflowTitlePublish, divWorkflowActifsPublish)
		divWorkflowWrapper.append(divWorkflowBoxPublish)

		$('#content-workflows').append(divRoleWrapper);

	}
}

$(document).ready(function() {
	$.ajax({
		url: '/abe/api/workflows/full'	
	})
	.done(function(data) {
		mountWorkflows(data)
	})
	.fail(function(err) {
		console.log(err)
	})

})
