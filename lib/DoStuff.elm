port module DoStuff exposing (..)

import Html exposing (..)
import Html.App as App

import String exposing ( join )
main : Program Never
main =
  App.program
    { init = init
    , view = view
    , update = update
    , subscriptions = subscriptions
    }

-- MODEL

type alias Model =
  { words : List String }

init : (Model, Cmd Msg)
init =
  (Model [], Cmd.none)

-- UPDATE

type Msg =
  Check String
  | Result String
  | Render String

update : Msg -> Model -> (Model, Cmd Msg)
update msg model =
  case msg of

    Check str ->
      ( Model (str :: model.words), result (str ++ " from Elm!") )
    Result r ->
      ( model, result "From Elm only" )
    Render str ->
      ( Model (str :: model.words), Cmd.none )

port result : String -> Cmd msg

-- SUBSCRIPTIONS

port check : (String -> msg) -> Sub msg
port render : (String -> msg) -> Sub msg

subscriptions : Model -> Sub Msg
subscriptions model =
  Sub.batch [check Check, render Render ]


view : Model -> Html Msg
view model = div [] [text ("from Elm view: " ++ (join "," model.words))]
