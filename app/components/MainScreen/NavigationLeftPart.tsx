"use client";

import Image from "next/image";

export default function LeftPart() {
  return (
    <div className="w-full flex flex-col">
      <div className="flex flex-col gap-1.25">
        <p className="font-nunito font-bold text-xl text-umami-orange">
          Категории
        </p>
        <div className="grid grid-cols-3 w-full gap-2.5">
          <div className=" flex flex-col">
            <div className="w-17.75 h-17.75 flex justify-center items-center border border-umami-light-gray/50 rounded-2xl bg-white">
              <Image
                src="/Pizza_3D.svg"
                width={55}
                height={55}
                alt="Pizza_3D"
              />
            </div>
            <p className="font-nunito font-bold text-sm text-umami-dark-gray max-w-17.75">
              Название
            </p>
          </div>
          <div className=" flex flex-col">
            <div className="w-17.75 h-17.75 flex justify-center items-center border border-umami-light-gray/50 rounded-2xl bg-white">
              <Image
                src="/Pizza_3D.svg"
                width={55}
                height={55}
                alt="Pizza_3D"
              />
            </div>
            <p className="font-nunito font-bold text-sm text-umami-dark-gray max-w-17.75">
              Название
            </p>
          </div>
          <div className=" flex flex-col">
            <div className="w-17.75 h-17.75 flex justify-center items-center border border-umami-light-gray/50 rounded-2xl bg-white">
              <Image
                src="/Pizza_3D.svg"
                width={55}
                height={55}
                alt="Pizza_3D"
              />
            </div>
            <p className="font-nunito font-bold text-sm text-umami-dark-gray max-w-17.75">
              Название
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
