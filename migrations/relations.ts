import { relations } from "drizzle-orm/relations";
import { tenants, apiCallLogs, users, whitelabelBranding, apiKeys, properties, propertyDetails, propertyComparables, motivatedSellerAnalysis, priceHistory, propertyAlerts, usersInAuth, pipelineStages, userProperties, propertyActivities, communications, documents, propertyScenarios, savedSearches, savedSearchMatches, lenderConnections, prequalifications, offers, propertyAlertNotifications, notifications, notificationSettings, apiUsage, billingTransactions, marketTemplates, marketTemplateMarkets } from "./schema";

export const apiCallLogsRelations = relations(apiCallLogs, ({one}) => ({
	tenant: one(tenants, {
		fields: [apiCallLogs.tenantId],
		references: [tenants.id]
	}),
	user: one(users, {
		fields: [apiCallLogs.userId],
		references: [users.id]
	}),
}));

export const tenantsRelations = relations(tenants, ({many}) => ({
	apiCallLogs: many(apiCallLogs),
	whitelabelBrandings: many(whitelabelBranding),
	apiKeys: many(apiKeys),
	users: many(users),
	userProperties: many(userProperties),
	pipelineStages: many(pipelineStages),
	propertyActivities: many(propertyActivities),
	communications: many(communications),
	documents: many(documents),
	propertyScenarios: many(propertyScenarios),
	savedSearches: many(savedSearches),
	lenderConnections: many(lenderConnections),
	prequalifications: many(prequalifications),
	offers: many(offers),
	notifications: many(notifications),
	apiUsages: many(apiUsage),
	billingTransactions: many(billingTransactions),
}));

export const usersRelations = relations(users, ({one, many}) => ({
	apiCallLogs: many(apiCallLogs),
	apiKeys: many(apiKeys),
	usersInAuth: one(usersInAuth, {
		fields: [users.supabaseUserId],
		references: [usersInAuth.id]
	}),
	tenant: one(tenants, {
		fields: [users.tenantId],
		references: [tenants.id]
	}),
	userProperties: many(userProperties),
	propertyActivities: many(propertyActivities),
	communications: many(communications),
	documents: many(documents),
	savedSearches: many(savedSearches),
	prequalifications: many(prequalifications),
	offers: many(offers),
	propertyAlertNotifications: many(propertyAlertNotifications),
	notifications: many(notifications),
	notificationSettings: many(notificationSettings),
}));

export const whitelabelBrandingRelations = relations(whitelabelBranding, ({one}) => ({
	tenant: one(tenants, {
		fields: [whitelabelBranding.tenantId],
		references: [tenants.id]
	}),
}));

export const apiKeysRelations = relations(apiKeys, ({one}) => ({
	tenant: one(tenants, {
		fields: [apiKeys.tenantId],
		references: [tenants.id]
	}),
	user: one(users, {
		fields: [apiKeys.userId],
		references: [users.id]
	}),
}));

export const propertyDetailsRelations = relations(propertyDetails, ({one}) => ({
	property: one(properties, {
		fields: [propertyDetails.zpid],
		references: [properties.zpid]
	}),
}));

export const propertiesRelations = relations(properties, ({many}) => ({
	propertyDetails: many(propertyDetails),
	propertyComparables: many(propertyComparables),
	motivatedSellerAnalyses: many(motivatedSellerAnalysis),
	priceHistories: many(priceHistory),
	propertyAlerts: many(propertyAlerts),
	userProperties: many(userProperties),
	savedSearchMatches: many(savedSearchMatches),
}));

export const propertyComparablesRelations = relations(propertyComparables, ({one}) => ({
	property: one(properties, {
		fields: [propertyComparables.zpid],
		references: [properties.zpid]
	}),
}));

export const motivatedSellerAnalysisRelations = relations(motivatedSellerAnalysis, ({one}) => ({
	property: one(properties, {
		fields: [motivatedSellerAnalysis.zpid],
		references: [properties.zpid]
	}),
}));

export const priceHistoryRelations = relations(priceHistory, ({one}) => ({
	property: one(properties, {
		fields: [priceHistory.zpid],
		references: [properties.zpid]
	}),
}));

export const propertyAlertsRelations = relations(propertyAlerts, ({one, many}) => ({
	property: one(properties, {
		fields: [propertyAlerts.zpid],
		references: [properties.zpid]
	}),
	propertyAlertNotifications: many(propertyAlertNotifications),
}));

export const usersInAuthRelations = relations(usersInAuth, ({many}) => ({
	users: many(users),
}));

export const userPropertiesRelations = relations(userProperties, ({one, many}) => ({
	pipelineStage: one(pipelineStages, {
		fields: [userProperties.pipelineStageId],
		references: [pipelineStages.id]
	}),
	tenant: one(tenants, {
		fields: [userProperties.tenantId],
		references: [tenants.id]
	}),
	user: one(users, {
		fields: [userProperties.userId],
		references: [users.id]
	}),
	property: one(properties, {
		fields: [userProperties.zpid],
		references: [properties.zpid]
	}),
	propertyActivities: many(propertyActivities),
	communications: many(communications),
	documents: many(documents),
	propertyScenarios: many(propertyScenarios),
	offers: many(offers),
}));

export const pipelineStagesRelations = relations(pipelineStages, ({one, many}) => ({
	userProperties: many(userProperties),
	tenant: one(tenants, {
		fields: [pipelineStages.tenantId],
		references: [tenants.id]
	}),
}));

export const propertyActivitiesRelations = relations(propertyActivities, ({one}) => ({
	tenant: one(tenants, {
		fields: [propertyActivities.tenantId],
		references: [tenants.id]
	}),
	user: one(users, {
		fields: [propertyActivities.userId],
		references: [users.id]
	}),
	userProperty: one(userProperties, {
		fields: [propertyActivities.userPropertyId],
		references: [userProperties.id]
	}),
}));

export const communicationsRelations = relations(communications, ({one}) => ({
	tenant: one(tenants, {
		fields: [communications.tenantId],
		references: [tenants.id]
	}),
	user: one(users, {
		fields: [communications.userId],
		references: [users.id]
	}),
	userProperty: one(userProperties, {
		fields: [communications.userPropertyId],
		references: [userProperties.id]
	}),
}));

export const documentsRelations = relations(documents, ({one}) => ({
	tenant: one(tenants, {
		fields: [documents.tenantId],
		references: [tenants.id]
	}),
	user: one(users, {
		fields: [documents.userId],
		references: [users.id]
	}),
	userProperty: one(userProperties, {
		fields: [documents.userPropertyId],
		references: [userProperties.id]
	}),
}));

export const propertyScenariosRelations = relations(propertyScenarios, ({one}) => ({
	tenant: one(tenants, {
		fields: [propertyScenarios.tenantId],
		references: [tenants.id]
	}),
	userProperty: one(userProperties, {
		fields: [propertyScenarios.userPropertyId],
		references: [userProperties.id]
	}),
}));

export const savedSearchesRelations = relations(savedSearches, ({one, many}) => ({
	tenant: one(tenants, {
		fields: [savedSearches.tenantId],
		references: [tenants.id]
	}),
	user: one(users, {
		fields: [savedSearches.userId],
		references: [users.id]
	}),
	savedSearchMatches: many(savedSearchMatches),
}));

export const savedSearchMatchesRelations = relations(savedSearchMatches, ({one}) => ({
	savedSearch: one(savedSearches, {
		fields: [savedSearchMatches.savedSearchId],
		references: [savedSearches.id]
	}),
	property: one(properties, {
		fields: [savedSearchMatches.zpid],
		references: [properties.zpid]
	}),
}));

export const lenderConnectionsRelations = relations(lenderConnections, ({one, many}) => ({
	tenant: one(tenants, {
		fields: [lenderConnections.tenantId],
		references: [tenants.id]
	}),
	prequalifications: many(prequalifications),
}));

export const prequalificationsRelations = relations(prequalifications, ({one}) => ({
	lenderConnection: one(lenderConnections, {
		fields: [prequalifications.lenderConnectionId],
		references: [lenderConnections.id]
	}),
	tenant: one(tenants, {
		fields: [prequalifications.tenantId],
		references: [tenants.id]
	}),
	user: one(users, {
		fields: [prequalifications.userId],
		references: [users.id]
	}),
}));

export const offersRelations = relations(offers, ({one}) => ({
	tenant: one(tenants, {
		fields: [offers.tenantId],
		references: [tenants.id]
	}),
	user: one(users, {
		fields: [offers.userId],
		references: [users.id]
	}),
	userProperty: one(userProperties, {
		fields: [offers.userPropertyId],
		references: [userProperties.id]
	}),
}));

export const propertyAlertNotificationsRelations = relations(propertyAlertNotifications, ({one}) => ({
	propertyAlert: one(propertyAlerts, {
		fields: [propertyAlertNotifications.propertyAlertId],
		references: [propertyAlerts.id]
	}),
	user: one(users, {
		fields: [propertyAlertNotifications.userId],
		references: [users.id]
	}),
}));

export const notificationsRelations = relations(notifications, ({one}) => ({
	tenant: one(tenants, {
		fields: [notifications.tenantId],
		references: [tenants.id]
	}),
	user: one(users, {
		fields: [notifications.userId],
		references: [users.id]
	}),
}));

export const notificationSettingsRelations = relations(notificationSettings, ({one}) => ({
	user: one(users, {
		fields: [notificationSettings.userId],
		references: [users.id]
	}),
}));

export const apiUsageRelations = relations(apiUsage, ({one}) => ({
	tenant: one(tenants, {
		fields: [apiUsage.tenantId],
		references: [tenants.id]
	}),
}));

export const billingTransactionsRelations = relations(billingTransactions, ({one}) => ({
	tenant: one(tenants, {
		fields: [billingTransactions.tenantId],
		references: [tenants.id]
	}),
}));

export const marketTemplateMarketsRelations = relations(marketTemplateMarkets, ({one}) => ({
	marketTemplate: one(marketTemplates, {
		fields: [marketTemplateMarkets.templateId],
		references: [marketTemplates.id]
	}),
}));

export const marketTemplatesRelations = relations(marketTemplates, ({many}) => ({
	marketTemplateMarkets: many(marketTemplateMarkets),
}));