"use client";

import { useState } from "react";
import ProfileSetupModal from "./ProfileSetupModal";

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
