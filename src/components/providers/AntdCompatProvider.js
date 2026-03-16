"use client";

import { ConfigProvider } from "antd";

export default function AntdCompatProvider({ children }) {
	return <ConfigProvider wave={{ disabled: true }}>{children}</ConfigProvider>;
}
