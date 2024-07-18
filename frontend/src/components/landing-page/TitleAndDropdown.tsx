import { useRouter } from "next/router";
import React, { useEffect, useState } from "react";

import cx from "classnames";
import { AiOutlineArrowRight } from "react-icons/ai";
import { useIntercom } from "react-use-intercom";
import { LoadingSpinner } from "~/components/basics/Loading";
import DragComponent from "../DragDrop/DragComponent";
import { FileData } from "../DragDrop/CustomContainer";
import { FileUploadService } from "~/utils/FileUploadService";

export const TitleAndDropdown = () => {
  const router = useRouter();
  const [isLoadingConversation, setIsLoadingConversation] = useState(false);

  const { boot } = useIntercom();
  const [ownerLicense, setOwnerLicense] = useState<FileData[]>([]);
  const uploadService = new FileUploadService(process.env.NEXT_PUBLIC_BACKEND_URL + "api/chat/bulkUpload");


  async function handleUploadClick() {
    try {
      setIsLoadingConversation(true);
      const files = ownerLicense.map((fileData) => fileData.photo);

      const response = await uploadService.bulkUpload(files);
      setIsLoadingConversation(false);
      console.log("Uploaded filenames:", response.filenames);
      router.push("/chat"); 

      // Handle success (e.g., show a success message or update the state)
    } catch (error) {
      console.error("Upload failed:", error);
      // Handle error (e.g., show an error message)
    }
  }

  useEffect(() => {
    boot();
  }, []);

  return (
    <div className=" h-screen landing-page-gradient-1 relative flex  w-screen flex-col items-center justify-center font-lora ">
        <div className="mt-5 flex h-min w-11/12 max-w-[1200px] flex-col items-center justify-center rounded-lg border-2 bg-white sm:h-[400px] md:w-9/12 ">
          <div className="p-4 text-center text-xl font-bold">
            Start your conversation by uploading the documents you want to
            explore
          </div>

          <div className="mt-2 flex h-full w-11/12 flex-col justify-start overflow-scroll px-4 ">
          <DragComponent
        ownerLicense={ownerLicense}
        setOwnerLicense={setOwnerLicense}
      />
          </div>

          <div className="h-1/8 mt-2 flex w-full items-center justify-center rounded-lg bg-gray-00">
            <div className="flex flex-wrap items-center justify-center">
              <div className="md:ml-12">
                <button
                  disabled={ownerLicense.length === 0}
                  onClick={handleUploadClick}
                  className={cx(
                    "m-4 rounded border bg-llama-indigo px-6 py-2 font-nunito text-white hover:bg-[#3B3775] disabled:bg-gray-30 ",
                    !(ownerLicense.length === 0) &&
                      "border-gray-300 bg-gray-300"
                  )}
                >
                  <div className="flex items-center justify-center">
                    {isLoadingConversation ? (
                      <div className="flex h-[22px] w-[180px] items-center justify-center">
                        <LoadingSpinner />
                      </div>
                    ) : (
                      <>
                        start your conversation
                        <div className="ml-2">
                          <AiOutlineArrowRight />
                        </div>
                      </>
                    )}
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
    </div>
  );
};
