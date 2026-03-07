import React from "react";
import { Tabs as AntTabs } from "antd";

const TabPane = () => null;

const normalizeItemsFromChildren = (children) => {
	const items = [];
	React.Children.forEach(children, (child, index) => {
		if (!React.isValidElement(child)) return;
		const {
			tab,
			label,
			children: paneChildren,
			...restProps
		} = child.props || {};
		const itemKey = `${child.key ?? index}`;
		items.push({
			key: itemKey,
			label: label ?? tab ?? itemKey,
			children: paneChildren,
			...restProps,
		});
	});
	return items;
};

export const Tabs = ({ children, items, ...props }) => {
	const normalizedItems = Array.isArray(items)
		? items
		: normalizeItemsFromChildren(children);
	return <AntTabs {...props} items={normalizedItems} />;
};

Tabs.TabPane = TabPane;

export { TabPane };
