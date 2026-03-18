import React from "react";
import { Input, InputNumber, Switch, Tooltip } from "antd";
import { QuestionCircleOutlined } from "@ant-design/icons";
import styled from "styled-components";

const WEBSITE_CONTROLS = [
  {
    field: "deactivateChatResponse",
    title: "Pause customer chat replies",
    description:
      "Use this when your team is away. Customers can still open chat, but they will be told live replies are currently unavailable.",
    onLabel: "Paused",
    offLabel: "Live",
  },
  {
    field: "aiAgentToRespond",
    title: "Allow AI to auto-reply in customer chats",
    description:
      "When enabled, the AI can answer customer chats. Individual chat switches inside Customer Service still control each case.",
    onLabel: "Allowed",
    offLabel: "Off",
  },
  {
    field: "deactivateOrderCreation",
    title: "Pause new order checkout",
    description:
      "Turn this on when you need to stop customers from placing new orders across the website.",
    onLabel: "Paused",
    offLabel: "Active",
  },
];

const StoreBasicInfo = ({
  storeData,
  setStoreData,
  websiteData,
  setWebsiteData,
}) => {
  const handleChange = (field, value) => {
    setStoreData((prev) => ({ ...prev, [field]: value }));
  };

  const handleWebsiteToggle = (field, checked) => {
    setWebsiteData?.((prev) => ({ ...prev, [field]: checked }));
  };

  return (
    <StoreBasicInfoWrapper>
      <h3>Basic Store Information</h3>

      <div className="row">
        <div className="col-md-4" style={{ marginBottom: 20 }}>
          <label>
            Store/ Brand Name{" "}
            <Tooltip title="The name of your store as displayed to customers">
              <QuestionCircleOutlined className="infoIcon" />
            </Tooltip>
          </label>
          <Input
            value={storeData.addStoreName}
            onChange={(e) => handleChange("addStoreName", e.target.value)}
          />
        </div>
        <div className="col-md-3" style={{ marginBottom: 20 }}>
          <label>
            Store Phone{" "}
            <Tooltip title="Public phone number for customer queries or support">
              <QuestionCircleOutlined className="infoIcon" />
            </Tooltip>
          </label>
          <Input
            value={storeData.storePhone}
            onChange={(e) => handleChange("storePhone", e.target.value)}
          />
        </div>
      </div>

      <div style={{ marginBottom: 20 }}>
        <label>
          Store Address{" "}
          <Tooltip title="Physical address of your store (for display or shipping returns)">
            <QuestionCircleOutlined className="infoIcon" />
          </Tooltip>
        </label>
        <Input
          value={storeData.storeAddress}
          onChange={(e) => handleChange("storeAddress", e.target.value)}
        />
      </div>

      <div className="row">
        <div className="col-md-3" style={{ marginBottom: 20 }}>
          <label>
            Loyalty Points To Award{" "}
            <Tooltip title="How many points the customer should obtain in order to be awarded (100 means the customer should reach 100 points of purchases in your store to be awarded) (if applicable)">
              <QuestionCircleOutlined className="infoIcon" />
            </Tooltip>
          </label>
          <InputNumber
            min={0}
            value={storeData.loyaltyPointsAward}
            onChange={(val) => handleChange("loyaltyPointsAward", val)}
          />
        </div>

        <div className="col-md-3" style={{ marginBottom: 20 }}>
          <label>
            Loyalty Points Award Discount{" "}
            <Tooltip title="The % off of user purchase if he/ she reached the target points (e.g. 10 means 10%)">
              <QuestionCircleOutlined className="infoIcon" />
            </Tooltip>
          </label>
          <InputNumber
            min={0}
            max={100}
            value={storeData.discountPercentage}
            onChange={(val) => handleChange("discountPercentage", val)}
          />
        </div>
      </div>

      <div className="row">
        <div className="col-md-3">
          <div style={{ marginBottom: 20 }}>
            <label>
              Transaction Fee %{" "}
              <Tooltip title="Fixed fee percentage charged by the platform on each transaction. This cannot be changed.">
                <QuestionCircleOutlined className="infoIcon" />
              </Tooltip>
            </label>
            <InputNumber
              min={0}
              max={100}
              value={storeData.transactionFeePercentage}
              disabled
            />
          </div>
        </div>
        <div className="col-md-3">
          <div style={{ marginBottom: 20 }}>
            <label>
              Purchase Taxes{" "}
              <Tooltip title="Tax percentage automatically applied to orders if needed">
                <QuestionCircleOutlined className="infoIcon" />
              </Tooltip>
            </label>
            <InputNumber
              min={0}
              value={storeData.purchaseTaxes}
              onChange={(val) => handleChange("purchaseTaxes", val)}
            />
          </div>
        </div>

        <div className="col-md-3">
          <div style={{ marginBottom: 20 }}>
            <label>
              Free Shipping Limit{" "}
              <Tooltip title="Minimum order amount for which shipping is free">
                <QuestionCircleOutlined className="infoIcon" />
              </Tooltip>
            </label>
            <InputNumber
              min={0}
              value={storeData.freeShippingLimit}
              onChange={(val) => handleChange("freeShippingLimit", val)}
            />
          </div>
        </div>

        <div className="col-md-3">
          <div style={{ marginBottom: 20 }}>
            <label>
              Discount On First Purchase (%){" "}
              <Tooltip title="Special discount for a customer’s very first order">
                <QuestionCircleOutlined className="infoIcon" />
              </Tooltip>
            </label>
            <InputNumber
              min={0}
              max={100}
              value={storeData.discountOnFirstPurchase}
              onChange={(val) => handleChange("discountOnFirstPurchase", val)}
            />
          </div>
        </div>
      </div>

      <div className="row">
        <div className="col-md-2">
          <div style={{ marginBottom: 20 }}>
            <label>
              Activate Pay On Delivery{" "}
              <Tooltip title="Currently disabled—no cash on delivery allowed.">
                <QuestionCircleOutlined className="infoIcon" />
              </Tooltip>
            </label>
            <Switch checked={storeData.activatePayOnDelivery} disabled />
          </div>
        </div>

        <div className="col-md-2">
          <div style={{ marginBottom: 20 }}>
            <label>
              Activate Pickup In Store{" "}
              <Tooltip title="Allow customers to pick up orders from store">
                <QuestionCircleOutlined className="infoIcon" />
              </Tooltip>
            </label>
            <Switch
              checked={storeData.activatePickupInStore}
              onChange={(val) => handleChange("activatePickupInStore", val)}
            />
          </div>
        </div>
        <div className="col-md-2">
          <div style={{ marginBottom: 20 }}>
            <label>
              Activate Pay Online{" "}
              <Tooltip title="Enable credit card or online payment gateways">
                <QuestionCircleOutlined className="infoIcon" />
              </Tooltip>
            </label>
            <Switch
              checked={storeData.activatePayOnline}
              onChange={(val) => handleChange("activatePayOnline", val)}
            />
          </div>
        </div>
      </div>

      {websiteData && setWebsiteData && (
        <>
          <SectionDivider />
          <SectionHeader>
            <h3>Website-Wide Operational Controls</h3>
            <p>
              These switches affect the full customer website, not just a single
              store.
            </p>
          </SectionHeader>

          <ControlsGrid>
            {WEBSITE_CONTROLS.map((control) => {
              const checked = Boolean(websiteData?.[control.field]);

              return (
                <ControlCard key={control.field}>
                  <ControlTopRow>
                    <div>
                      <ControlTitle>{control.title}</ControlTitle>
                      <ControlStatus $active={checked}>
                        {checked ? control.onLabel : control.offLabel}
                      </ControlStatus>
                    </div>
                    <Switch
                      checked={checked}
                      onChange={(value) =>
                        handleWebsiteToggle(control.field, value)
                      }
                    />
                  </ControlTopRow>
                  <ControlDescription>{control.description}</ControlDescription>
                </ControlCard>
              );
            })}
          </ControlsGrid>
        </>
      )}
    </StoreBasicInfoWrapper>
  );
};

export default StoreBasicInfo;

const StoreBasicInfoWrapper = styled.div`
  label {
    padding: 2px;
  }
  .infoIcon {
    margin-left: 5px;
    color: #999;
    cursor: pointer;
    transition: color 0.2s;
  }
  .infoIcon:hover {
    color: #333;
  }
`;

const SectionDivider = styled.div`
  margin: 26px 0 20px;
  border-top: 1px solid #e7e7e7;
`;

const SectionHeader = styled.div`
  margin-bottom: 18px;

  h3 {
    margin-bottom: 6px;
  }

  p {
    margin: 0;
    color: #666;
    font-size: 0.95rem;
  }
`;

const ControlsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 16px;
`;

const ControlCard = styled.div`
  padding: 18px;
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  background: #fafbfc;
`;

const ControlTopRow = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 10px;
`;

const ControlTitle = styled.div`
  font-weight: 700;
  line-height: 1.35;
  color: #1f2937;
`;

const ControlStatus = styled.div`
  display: inline-block;
  margin-top: 8px;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 0.8rem;
  font-weight: 700;
  color: ${(props) => (props.$active ? "#7c2d12" : "#166534")};
  background: ${(props) => (props.$active ? "#ffedd5" : "#dcfce7")};
`;

const ControlDescription = styled.p`
  margin: 0;
  color: #5b6472;
  line-height: 1.6;
`;
