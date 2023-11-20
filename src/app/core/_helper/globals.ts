import { Injectable } from "@angular/core";
import { Principal } from "../_models/principal";
import { Preferences } from "../_models/preferences";

@Injectable({
  providedIn: "root",
})
export class Globals {
  lang: string = "en";
  dir: string = "ltr";
  authenticated: boolean = false;

  principal: Principal = new Principal([], {}, [], "", "", "");
  // preferences: Preferences = new Preferences(true, false, false, 'red', '../../../assets/img/full-screen-image-2.jpg', 10);
}
