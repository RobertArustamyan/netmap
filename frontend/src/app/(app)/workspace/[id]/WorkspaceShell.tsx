"use client";

import { useState } from "react";
import ProfileSetupModal from "./ProfileSetupModal";
import PostHogIdentify from "@/components/PostHogIdentify";

interface Props {
  children: React.ReactNode;
  workspaceId: string;
  workspaceName: string;
  profileComplete: boolean;
  userEmail: string;
}

export default function WorkspaceShell({
  children,
  workspaceId,
  workspaceName,
  profileComplete,
  userEmail,
}: Props) {
  const [showModal, setShowModal] = useState(!profileComplete);

  return (
    <>
      <PostHogIdentify />
      {children}
      {showModal && (
        <ProfileSetupModal
          workspaceId={workspaceId}
          workspaceName={workspaceName}
          initialEmail={userEmail}
          onComplete={() => setShowModal(false)}
        />
      )}
    </>
  );
}
