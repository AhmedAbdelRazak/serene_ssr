/** @format */

import React, { useEffect, useState } from "react";
import styled from "styled-components";
import { toast } from "react-toastify";
import { isAuthenticated } from "../../auth";
import {
	getAiCampaigns,
	updateAiCampaignStatus,
	runAiCampaignAudit,
	refreshAiCampaignAnalytics,
} from "../apiAdmin";

const ManageCampaigns = () => {
	const { user, token } = isAuthenticated();

	const [campaigns, setCampaigns] = useState([]);
	const [loading, setLoading] = useState(false);

	const loadCampaigns = () => {
		if (!user || !token) return;
		setLoading(true);
		getAiCampaigns(user._id, token)
			.then((data) => {
				if (data && data.error) {
					toast.error(data.error);
				} else {
					setCampaigns(Array.isArray(data) ? data : []);
				}
			})
			.catch(() => {
				toast.error("Error loading AI campaigns");
			})
			.finally(() => setLoading(false));
	};

	useEffect(() => {
		loadCampaigns();
		// eslint-disable-next-line
	}, []);

	const statusLabel = (campaign) => {
		return (
			campaign.status ||
			(campaign.lifecycle && campaign.lifecycle.status) ||
			"unknown"
		);
	};

	const lastAuditLabel = (campaign) => {
		const d =
			(campaign.lifecycle && campaign.lifecycle.lastAuditAt) ||
			campaign.schedule?.lastAuditAt;
		if (!d) return "-";
		return new Date(d).toLocaleString();
	};

	const handleStatusChange = async (campaignId, newStatus) => {
		try {
			const res = await updateAiCampaignStatus(
				campaignId,
				user._id,
				token,
				newStatus
			);

			if (res && res.error) {
				return toast.error(res.error);
			}
			toast.success(`Campaign status updated to ${newStatus}`);
			loadCampaigns();
		} catch (err) {
			toast.error("Error updating campaign status");
		}
	};

	const handlePauseResume = (campaign) => {
		const current =
			campaign.status ||
			(campaign.lifecycle && campaign.lifecycle.status) ||
			"active";

		if (current === "paused") {
			handleStatusChange(campaign._id, "active");
		} else {
			handleStatusChange(campaign._id, "paused");
		}
	};

	const handleCancel = (campaign) => {
		if (
			!window.confirm(
				"Are you sure you want to cancel this campaign? The AI will stop managing and ads will be turned off."
			)
		) {
			return;
		}
		handleStatusChange(campaign._id, "cancelled_by_user");
	};

	const handleRunAudit = async (campaign) => {
		try {
			const res = await runAiCampaignAudit(campaign._id, user._id, token);
			if (res && res.error) {
				return toast.error(res.error);
			}
			toast.success("Audit triggered. Check logs & performance after a bit.");
			loadCampaigns();
		} catch (err) {
			toast.error("Error running manual audit");
		}
	};

	const handleRefreshAnalytics = async (campaign) => {
		try {
			const res = await refreshAiCampaignAnalytics(
				campaign._id,
				user._id,
				token
			);
			if (res && res.error) {
				return toast.error(res.error);
			}
			toast.success("Analytics refreshed");
			loadCampaigns();
		} catch (err) {
			toast.error("Error refreshing analytics");
		}
	};

	return (
		<ManageCampaignsWrapper>
			<div className='mainContent'>
				<div className='row mt-4'>
					<div className='col-md-12'>
						<h3
							className='mb-4'
							style={{ color: "black", fontWeight: "bold", fontSize: "1.2rem" }}
						>
							Manage AI Campaigns
						</h3>

						{loading ? (
							<p>Loading campaigns...</p>
						) : campaigns.length === 0 ? (
							<p>No campaigns created yet.</p>
						) : (
							<table className='table table-striped table-bordered'>
								<thead>
									<tr>
										<th>Name</th>
										<th>Objective</th>
										<th>Budget (daily)</th>
										<th>Current Daily</th>
										<th>Status</th>
										<th>Last Audit</th>
										<th>Automation</th>
										<th>Actions</th>
									</tr>
								</thead>
								<tbody>
									{campaigns.map((c) => (
										<tr key={c._id}>
											<td>{c.name}</td>
											<td>{c.objective || "sales"}</td>
											<td>
												{c.budget
													? `${c.budget.dailyMin} – ${c.budget.dailyMax} ${
															c.currency || "USD"
														}`
													: "-"}
											</td>
											<td>
												{c.budget && c.budget.currentDaily
													? `${c.budget.currentDaily} ${c.currency || "USD"}`
													: "-"}
											</td>
											<td>{statusLabel(c)}</td>
											<td>{lastAuditLabel(c)}</td>
											<td>
												{c.automationSettings && c.automationSettings.enabled
													? "ON"
													: "OFF"}
											</td>
											<td>
												<button
													className='btn btn-sm btn-outline-primary mr-2 mb-1'
													onClick={() => handlePauseResume(c)}
												>
													{statusLabel(c) === "paused" ? "Resume" : "Pause"}
												</button>
												<button
													className='btn btn-sm btn-outline-danger mr-2 mb-1'
													onClick={() => handleCancel(c)}
												>
													Cancel
												</button>
												<button
													className='btn btn-sm btn-outline-secondary mr-2 mb-1'
													onClick={() => handleRunAudit(c)}
												>
													Run Audit
												</button>
												<button
													className='btn btn-sm btn-outline-info mb-1'
													onClick={() => handleRefreshAnalytics(c)}
												>
													Refresh Analytics
												</button>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						)}
					</div>
				</div>
			</div>
		</ManageCampaignsWrapper>
	);
};

export default ManageCampaigns;

const ManageCampaignsWrapper = styled.div`
	min-height: 600px;
	overflow-x: hidden;
	margin-bottom: 20px;

	table {
		background: white;
	}
`;
