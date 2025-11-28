"use client";

import { useState } from "react";
import { Button } from "../ui/button";
import { toast } from "react-hot-toast";
import axios from "@/lib/axios";

interface PaytrailConnectProps {
  connected: boolean;
}

export const PaytrailConnect = ({ connected }: PaytrailConnectProps) => {
  const [loading, setLoading] = useState(false);

  const handleConnect = async () => {
    try {
      setLoading(true);

      // Check if Paytrail is configured
      const response = await axios.post('/api/paytrail/merchant');

      if (response.data.configured) {
        toast.success("Paytrail is already configured and ready to use!");
      } else {
        toast.error(response.data.error || "Paytrail configuration required");
      }
    } catch (error) {
      console.error("Paytrail connection error:", error);
      toast.error("Failed to verify Paytrail configuration");
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = () => {
    toast.error("Paytrail configuration is managed through environment variables. Contact your administrator to modify settings.");
  };

  return (
    <div className="flex flex-col gap-2">
      {connected ? (
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDisconnect}
            disabled
          >
            Disconnect
          </Button>
        </div>
      ) : (
        <Button
          onClick={handleConnect}
          disabled={loading}
          className="w-fit"
        >
          {loading ? "Checking..." : "Verify Configuration"}
        </Button>
      )}

      <div className="text-xs text-muted-foreground mt-2">
        {connected
          ? ""
          : "Configure PAYTRAIL_MERCHANT_ID and PAYTRAIL_SECRET_KEY in environment variables"
        }
      </div>
    </div>
  );
};
